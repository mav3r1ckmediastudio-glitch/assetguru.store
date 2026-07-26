import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import { getStripe } from '$lib/server/stripe';

const schema = z.object({ status:z.enum(['Open','Investigating','Resolved','Declined']) });
const statusMap = { Open:'open', Investigating:'investigating', Resolved:'resolved', Declined:'declined' } as const;
const assertNoError = (error:unknown) => { if (error) throw error; };

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['admin']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: adminCase, error: caseReadError } = await admin.from('admin_cases').select('*').eq('case_number', params.id).single();
    if (caseReadError || !adminCase) return json({ message:'Case not found.' }, { status:404 });
    const next = statusMap[body.status];
    if (['resolved','declined'].includes(adminCase.status) && adminCase.status !== next) {
      return json({ message:'A closed case cannot be reopened or changed to a different outcome.' }, { status:409 });
    }

    if (adminCase.case_type === 'refund' && adminCase.refund_request_id) {
      const [{ data:refundRequest, error:refundReadError }, { data:item, error:itemReadError }, { data:order, error:orderReadError }] = await Promise.all([
        admin.from('refund_requests').select('*').eq('id', adminCase.refund_request_id).single(),
        admin.from('order_items').select('*').eq('id', adminCase.order_item_id).single(),
        admin.from('orders').select('*').eq('id', adminCase.order_id).single()
      ]);
      assertNoError(refundReadError); assertNoError(itemReadError); assertNoError(orderReadError);
      if (!refundRequest || !item || !order) throw new Error('REFUND_DATA_MISSING');
      if (refundRequest.status === 'refunded' && next !== 'resolved') return json({ message:'This refund has already completed.' }, { status:409 });

      if (next === 'resolved' && refundRequest.status !== 'refunded') {
        let stripeRefundId:string|null = refundRequest.stripe_refund_id ?? null;
        const refundAmount = Number(item.unit_amount_pence ?? 0) + Number(item.tax_amount_pence ?? 0);
        if (refundAmount > 0 && order.stripe_payment_intent_id) {
          const refund = await getStripe().refunds.create({
            payment_intent:order.stripe_payment_intent_id,
            amount:refundAmount,
            metadata:{ assetguru_case:adminCase.case_number, order_id:order.id, order_item_id:item.id }
          }, { idempotencyKey:`assetguru-refund-${refundRequest.id}` });
          stripeRefundId = refund.id;
        }
        if (item.stripe_transfer_id && Number(item.vendor_net_pence) > 0) {
          await getStripe().transfers.createReversal(item.stripe_transfer_id, {
            amount:Number(item.vendor_net_pence), metadata:{ assetguru_case:adminCase.case_number }
          }, { idempotencyKey:`assetguru-reversal-${refundRequest.id}` });
        }

        assertNoError((await admin.from('order_items').update({ status:'refunded', refund_amount_pence:refundAmount }).eq('id', item.id)).error);
        assertNoError((await admin.from('entitlements').update({ status:'revoked' }).eq('order_item_id', item.id)).error);
        assertNoError((await admin.from('refund_requests').update({ status:'refunded', stripe_refund_id:stripeRefundId, decided_by:user.id, decided_at:new Date().toISOString() }).eq('id', refundRequest.id)).error);
        assertNoError((await admin.from('payouts').update({ status:'reversed', refunded_pence:item.vendor_net_pence }).eq('order_item_id', item.id)).error);
        assertNoError((await admin.rpc('refresh_product_sales', { target_product:item.product_id })).error);
        const { data:remaining, error:remainingError } = await admin.from('order_items').select('status').eq('order_id', order.id);
        assertNoError(remainingError);
        const allRefunded = (remaining ?? []).every((entry:any) => entry.status === 'refunded');
        assertNoError((await admin.from('orders').update({ status:allRefunded ? 'refunded' : 'partially_refunded' }).eq('id', order.id)).error);
      } else if (next === 'declined') {
        assertNoError((await admin.from('refund_requests').update({ status:'declined', decided_by:user.id, decided_at:new Date().toISOString() }).eq('id', refundRequest.id)).error);
        assertNoError((await admin.from('order_items').update({ status:'refund_declined' }).eq('id', item.id)).error);
      } else if (next === 'investigating') {
        assertNoError((await admin.from('refund_requests').update({ status:'investigating' }).eq('id', refundRequest.id)).error);
      } else if (next === 'open') {
        assertNoError((await admin.from('refund_requests').update({ status:'open' }).eq('id', refundRequest.id)).error);
      }

      const { data:vendor, error:vendorError } = await admin.from('vendor_profiles').select('user_id').eq('id', adminCase.vendor_id).maybeSingle();
      assertNoError(vendorError);
      const notices = [
        adminCase.buyer_id ? { user_id:adminCase.buyer_id, type:'refund', title:`Refund case ${body.status.toLowerCase()}`, body:`Case ${adminCase.case_number} is now ${body.status.toLowerCase()}.`, href:'/account/support', dedupe_key:`case:${adminCase.id}:buyer:${next}` } : null,
        vendor?.user_id ? { user_id:vendor.user_id, type:'refund', title:`Refund case ${body.status.toLowerCase()}`, body:`Case ${adminCase.case_number} is now ${body.status.toLowerCase()}.`, href:'/creator/orders', dedupe_key:`case:${adminCase.id}:vendor:${next}` } : null
      ].filter(Boolean);
      if (notices.length) assertNoError((await admin.from('notifications').upsert(notices, { onConflict:'dedupe_key' })).error);
    }

    assertNoError((await admin.from('admin_cases').update({ status:next, assigned_to:user.id }).eq('id', adminCase.id)).error);
    await writeAudit({ actorId:user.id, actorRole:'admin', action:`case.${next}`, entityType:'admin_case', entityId:adminCase.id, metadata:{ case_number:adminCase.case_number }, request });
    return json({ ok:true });
  } catch (error) {
    console.error(error);
    const e = apiError(error);
    return json({ message:error instanceof z.ZodError ? 'Invalid case decision.' : e.message }, { status:error instanceof z.ZodError ? 400 : e.status });
  }
}
