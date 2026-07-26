import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const schema = z.object({
  status:z.enum(['Pending','Approved','More information','Suspended']).optional(),
  reason:z.string().max(3000).optional(),
  commission:z.number().min(0).max(100).optional()
}).refine((value) => value.status !== undefined || value.commission !== undefined, { message:'No vendor change was supplied.' });
const statusMap = { Pending:'pending', Approved:'approved', 'More information':'more_information', Suspended:'suspended' } as const;

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['admin']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const patch: Record<string, unknown> = {};

    if (body.status) {
      const next = statusMap[body.status];
      patch.status = next;
      patch.status_reason = body.reason ?? '';
      patch.approved_at = next === 'approved' ? new Date().toISOString() : null;
      patch.approved_by = next === 'approved' ? user.id : null;
    }
    if (body.commission !== undefined) patch.commission_percent = body.commission;

    const { data:vendor, error } = await admin.from('vendor_profiles').update(patch).eq('id', params.id).select('id,user_id,display_name,status,commission_percent').single();
    if (error) throw error;

    if (body.status) {
      const next = statusMap[body.status];
      if (next === 'suspended') {
        const { error:retireError } = await admin.from('products').update({ status:'retired' }).eq('vendor_id', params.id).eq('status', 'published');
        if (retireError) throw retireError;
      }
      const { error:notificationError } = await admin.from('notifications').upsert({
        user_id:vendor.user_id,
        type:next === 'approved' ? 'success' : 'vendor',
        title:next === 'approved' ? 'Creator account approved' : 'Creator application updated',
        body:next === 'approved' ? 'Your creator account is approved. Connect Stripe before accepting paid sales.' : body.reason || `Your creator status is now ${body.status}.`,
        href:'/creator',
        dedupe_key:`vendor:${vendor.id}:${next}`
      }, { onConflict:'dedupe_key' });
      if (notificationError) throw notificationError;
      await writeAudit({ actorId:user.id, actorRole:'admin', action:`vendor.${next}`, entityType:'vendor_profile', entityId:vendor.id, metadata:{ reason:body.reason ?? '' }, request });
    }

    if (body.commission !== undefined) {
      await writeAudit({ actorId:user.id, actorRole:'admin', action:'vendor.commission_updated', entityType:'vendor_profile', entityId:vendor.id, metadata:{ commission_percent:body.commission }, request });
    }

    return json({ ok:true, commission:Number(vendor.commission_percent ?? body.commission ?? 0) });
  } catch (error) {
    const e = apiError(error);
    return json({ message:error instanceof z.ZodError ? 'Invalid vendor update.' : e.message }, { status:error instanceof z.ZodError ? 400 : e.status });
  }
}
