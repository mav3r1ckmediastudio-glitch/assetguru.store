import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const schema = z.object({ status: z.enum(['Queued','In review','Changes requested','Approved','Rejected']), notes: z.string().max(5000).optional() });
const statusMap = { Queued:'draft', 'In review':'in_review', 'Changes requested':'changes_requested', Approved:'published', Rejected:'rejected' } as const;

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['admin']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: product } = await admin.from('products').select('id,title,slug,vendor_id,status,published_at').eq('id', params.id).single();
    if (!product) return json({ message: 'Moderation item not found.' }, { status: 404 });
    if (product.status !== 'in_review') return json({ message: 'This submission is no longer awaiting moderation.' }, { status: 409 });

    const next = statusMap[body.status];
    if (!['published','changes_requested','rejected'].includes(next)) return json({ message: 'Choose an approval, changes-requested or rejection decision.' }, { status: 400 });

    const { data: pendingVersions, error: versionsError } = await admin
      .from('product_versions')
      .select('id,created_at')
      .eq('product_id', product.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (versionsError) throw versionsError;
    const submittedVersion = pendingVersions?.[0];
    if (!submittedVersion) return json({ message: 'This product has no uploaded version ready for moderation.' }, { status: 409 });

    const patch: Record<string, unknown> = { status: next, moderation_notes: body.notes ?? '' };
    if (next === 'published' && !product.published_at) patch.published_at = new Date().toISOString();
    const { error } = await admin.from('products').update(patch).eq('id', product.id);
    if (error) throw error;

    if (next === 'published') {
      const approvedAt = new Date().toISOString();
      const { error: currentError } = await admin.from('product_versions').update({ is_current: false }).eq('product_id', product.id);
      if (currentError) throw currentError;
      const { error: approveError } = await admin.from('product_versions').update({ status:'approved', is_current:true, approved_at:approvedAt, approved_by:user.id }).eq('id', submittedVersion.id);
      if (approveError) throw approveError;
      const { error: supersedeError } = await admin.from('product_versions').update({ status:'rejected', is_current:false }).eq('product_id', product.id).eq('status','pending').neq('id',submittedVersion.id);
      if (supersedeError) throw supersedeError;
    } else if (next === 'rejected') {
      const { error: rejectError } = await admin.from('product_versions').update({ status:'rejected', is_current:false }).eq('id', submittedVersion.id);
      if (rejectError) throw rejectError;
    }

    const { data: vendor } = await admin.from('vendor_profiles').select('user_id').eq('id', product.vendor_id).single();
    if (vendor?.user_id) {
      await admin.from('notifications').upsert({
        user_id: vendor.user_id,
        type: next === 'published' ? 'success' : 'moderation',
        title: next === 'published' ? 'Asset approved' : 'Asset moderation update',
        body: `${product.title} is now ${body.status.toLowerCase()}.${body.notes ? ` ${body.notes}` : ''}`,
        href: `/creator/products/${product.slug}`,
        dedupe_key: `moderation:${product.id}:${submittedVersion.id}:${next}`
      }, { onConflict: 'dedupe_key' });
    }
    await writeAudit({ actorId:user.id, actorRole:'admin', action:`product.${next}`, entityType:'product', entityId:product.id, metadata:{ notes:body.notes ?? '', version_id:submittedVersion.id }, request });
    return json({ ok:true });
  } catch (error) {
    const e = apiError(error);
    return json({ message:error instanceof z.ZodError ? 'Invalid moderation decision.' : e.message }, { status:error instanceof z.ZodError ? 400 : e.status });
  }
}
