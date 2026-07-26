import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const schema = z.object({ status:z.enum(['Pending','Approved','More information','Suspended']), reason:z.string().max(3000).optional() });
const statusMap = { Pending:'pending', Approved:'approved', 'More information':'more_information', Suspended:'suspended' } as const;

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['admin']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const next = statusMap[body.status];
    const { data:vendor, error } = await admin.from('vendor_profiles').update({
      status:next,
      status_reason:body.reason ?? '',
      approved_at:next === 'approved' ? new Date().toISOString() : null,
      approved_by:next === 'approved' ? user.id : null
    }).eq('id', params.id).select('id,user_id,display_name').single();
    if (error) throw error;
    if (next === 'suspended') {
      const { error:retireError } = await admin.from('products').update({ status:'retired' }).eq('vendor_id', params.id).eq('status', 'published');
      if (retireError) throw retireError;
    }
    const { error:notificationError } = await admin.from('notifications').upsert({
      user_id:vendor.user_id,
      type:next === 'approved' ? 'success' : 'vendor',
      title:next === 'approved' ? 'Creator account approved' : 'Creator application updated',
      body:next === 'approved' ? 'Your creator account is approved. Connect Stripe to begin uploading assets.' : body.reason || `Your creator status is now ${body.status}.`,
      href:'/creator',
      dedupe_key:`vendor:${vendor.id}:${next}`
    }, { onConflict:'dedupe_key' });
    if (notificationError) throw notificationError;
    await writeAudit({ actorId:user.id, actorRole:'admin', action:`vendor.${next}`, entityType:'vendor_profile', entityId:vendor.id, metadata:{ reason:body.reason ?? '' }, request });
    return json({ ok:true });
  } catch (error) {
    const e = apiError(error);
    return json({ message:error instanceof z.ZodError ? 'Invalid vendor decision.' : e.message }, { status:error instanceof z.ZodError ? 400 : e.status });
  }
}
