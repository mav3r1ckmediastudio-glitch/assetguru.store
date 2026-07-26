import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type Stripe from 'stripe';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin, writeAudit } from '$lib/server/supabase';
import { fulfilOrder } from '$lib/server/orders';

export async function POST({ request }: import('./$types').RequestEvent) {
  const signature = request.headers.get('stripe-signature');
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) return json({ message: 'Webhook is not configured.' }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Stripe signature verification failed', error);
    return json({ message: 'Invalid signature.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.assetguru_order_id ?? session.client_reference_id;
        // Delayed payment methods also emit checkout.session.completed. Wait for
        // async_payment_succeeded unless Stripe confirms funds are available now.
        if (orderId && ['paid', 'no_payment_required'].includes(session.payment_status)) await fulfilOrder(orderId, session);
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.assetguru_order_id ?? session.client_reference_id;
        if (orderId) await fulfilOrder(orderId, session);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.assetguru_order_id ?? session.client_reference_id;
        if (orderId) { const { error } = await admin.from('orders').update({ status: 'failed' }).eq('id', orderId).eq('status', 'pending'); if (error) throw error; await writeAudit({ actorRole:'stripe', action:'checkout.payment_failed', entityType:'order', entityId:orderId, metadata:{ checkout_session_id:session.id } }); }
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const vendorId = account.metadata?.assetguru_vendor_id;
        if (vendorId) {
          const { error } = await admin.from('vendor_profiles').update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_details_submitted: account.details_submitted
          }).eq('id', vendorId);
          if (error) throw error;
          await writeAudit({ actorRole:'stripe', action:'stripe.account_updated', entityType:'vendor_profile', entityId:vendorId, metadata:{ charges_enabled:account.charges_enabled, payouts_enabled:account.payouts_enabled, details_submitted:account.details_submitted } });
        }
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
        const { data: order } = await admin.from('orders').select('id,user_id,order_number,total_pence').eq('stripe_charge_id', charge).maybeSingle();
        if (order) {
          const { data: existing } = await admin.from('admin_cases').select('id').contains('evidence', { stripe_dispute_id: dispute.id }).maybeSingle();
          if (!existing) {
            await admin.from('admin_cases').insert({
              case_number: `CASE-${crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase()}`,
              case_type: 'chargeback',
              status: 'open',
              priority: 'urgent',
              buyer_id: order.user_id,
              order_id: order.id,
              amount_pence: dispute.amount,
              summary: `Stripe dispute ${dispute.id} opened for order ${order.order_number}.`,
              evidence: { stripe_dispute_id: dispute.id, reason: dispute.reason }
            });
            await writeAudit({ actorRole: 'stripe', action: 'chargeback.opened', entityType: 'order', entityId: order.id, metadata: { dispute_id: dispute.id } });
          }
        }
        break;
      }
      default:
        break;
    }
    return json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handling failed', event.type, error);
    return json({ message: 'Webhook handling failed.' }, { status: 500 });
  }
}
