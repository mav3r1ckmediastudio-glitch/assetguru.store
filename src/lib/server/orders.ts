import type Stripe from 'stripe';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin, writeAudit } from '$lib/server/supabase';

function assertNoError(error: unknown) {
  if (error) throw error;
}

export async function fulfilOrder(orderId: string, checkoutSession?: Stripe.Checkout.Session | null) {
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from('orders')
    .select(`*,items:order_items(*,product:products(id,title,slug),version:product_versions(id,version),vendor:vendor_profiles(id,user_id,display_name,stripe_account_id,stripe_payouts_enabled))`)
    .eq('id', orderId)
    .single();
  if (error || !order) throw error ?? new Error('ORDER_NOT_FOUND');

  // A later retry must never reactivate an entitlement after a refund.
  if (['partially_refunded', 'refunded'].includes(order.status)) return order;

  const items = (order.items ?? []) as any[];
  const subtotal = checkoutSession?.amount_subtotal ?? Number(order.subtotal_pence);
  const tax = checkoutSession?.total_details?.amount_tax ?? Number(order.tax_pence ?? 0);
  const total = checkoutSession?.amount_total ?? Number(order.total_pence || subtotal + tax);
  const paymentIntentId = typeof checkoutSession?.payment_intent === 'string'
    ? checkoutSession.payment_intent
    : order.stripe_payment_intent_id ?? null;

  let chargeId: string | null = order.stripe_charge_id ?? null;
  if (paymentIntentId && !chargeId) {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id ?? null;
  }

  // Marking the order paid happens before fulfilment, but paid orders are deliberately
  // re-entrant so a failed transfer or entitlement write is completed on webhook retry.
  assertNoError((await admin.from('orders').update({
    status: 'paid',
    subtotal_pence: subtotal,
    tax_pence: tax,
    total_pence: total,
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    paid_at: order.paid_at ?? new Date().toISOString(),
    payment_method_summary: paymentIntentId ? 'Stripe' : 'Free checkout'
  }).eq('id', order.id)).error);

  let allocatedTax = 0;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.status === 'refunded') continue;

    const itemTax = index === items.length - 1
      ? tax - allocatedTax
      : Math.round(tax * (Number(item.unit_amount_pence) / Math.max(1, subtotal)));
    allocatedTax += itemTax;

    assertNoError((await admin.from('order_items').update({ tax_amount_pence: itemTax, status: 'paid' }).eq('id', item.id)).error);
    assertNoError((await admin.from('entitlements').upsert({
      user_id: order.user_id,
      product_id: item.product_id,
      order_item_id: item.id,
      purchased_version_id: item.product_version_id,
      licence_type: item.licence_type,
      status: 'active'
    }, { onConflict: 'user_id,product_id' })).error);
    assertNoError((await admin.rpc('refresh_product_sales', { target_product: item.product_id })).error);

    let transferId = item.stripe_transfer_id as string | null;
    if (!transferId && Number(item.vendor_net_pence) > 0 && item.vendor?.stripe_account_id && item.vendor?.stripe_payouts_enabled && paymentIntentId) {
      const transfer = await getStripe().transfers.create({
        amount: Number(item.vendor_net_pence),
        currency: order.currency,
        destination: item.vendor.stripe_account_id,
        transfer_group: `AG_ORDER_${order.id}`,
        source_transaction: chargeId ?? undefined,
        metadata: {
          assetguru_order_id: order.id,
          assetguru_order_item_id: item.id,
          product_id: item.product_id,
          vendor_id: item.vendor_id
        }
      }, { idempotencyKey: `assetguru-transfer-${item.id}` });
      transferId = transfer.id;
      assertNoError((await admin.from('order_items').update({ stripe_transfer_id: transfer.id }).eq('id', item.id)).error);
      assertNoError((await admin.from('payouts').upsert({
        vendor_id: item.vendor_id,
        order_id: order.id,
        order_item_id: item.id,
        stripe_transfer_id: transfer.id,
        gross_pence: item.unit_amount_pence,
        commission_pence: item.commission_pence,
        net_pence: item.vendor_net_pence,
        currency: order.currency,
        status: 'paid',
        paid_at: new Date().toISOString()
      }, { onConflict: 'stripe_transfer_id' })).error);
    }

    if (item.vendor?.user_id) {
      assertNoError((await admin.from('notifications').upsert({
        user_id: item.vendor.user_id,
        type: 'sale',
        title: 'New marketplace sale',
        body: `${item.product?.title ?? 'An asset'} sold for £${(Number(item.unit_amount_pence) / 100).toFixed(2)}.`,
        href: '/creator/orders',
        dedupe_key: `sale:${item.id}`
      }, { onConflict: 'dedupe_key' })).error);
    }
  }

  assertNoError((await admin.from('notifications').upsert({
    user_id: order.user_id,
    type: 'purchase',
    title: 'Order complete',
    body: `Order ${order.order_number} is ready in your library.`,
    href: `/account/orders/${order.order_number}`,
    dedupe_key: `purchase:${order.id}`
  }, { onConflict: 'dedupe_key' })).error);

  // Only the first successful pass records the fulfilment event. Retries still repair
  // any missing transfer or entitlement without duplicating the user-facing action.
  if (order.status !== 'paid') {
    await writeAudit({
      actorId: order.user_id,
      actorRole: 'buyer',
      action: 'order.fulfilled',
      entityType: 'order',
      entityId: order.id,
      metadata: { order_number: order.order_number, total_pence: total, payment_intent_id: paymentIntentId }
    });
  }
  return { ...order, status: 'paid' };
}
