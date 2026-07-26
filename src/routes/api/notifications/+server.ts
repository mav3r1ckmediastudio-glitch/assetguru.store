import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, requireRole, writeAudit } from '$lib/server/supabase';

const schema = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).refine((value) => Boolean(value.id || value.all), 'Choose a notification or mark all.');

export async function PATCH({ locals, request }: import('./$types').RequestEvent) {
  try {
    const { user, profile } = await requireRole(locals, ['buyer','vendor','admin']);
    const supabase = locals.supabase;
    const body = schema.parse(await request.json());
    let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    if (body.id) query = query.eq('id', body.id);
    const { error } = await query;
    if (error) throw error;
    await writeAudit({ actorId: user.id, actorRole: String(profile.role), action: body.all ? 'notifications.read_all' : 'notification.read', entityType: 'notification', entityId: body.id, request });
    return json({ ok: true });
  } catch (error) {
    const e = apiError(error);
    return json({ message: error instanceof z.ZodError ? 'Invalid notification request.' : e.message }, { status: error instanceof z.ZodError ? 400 : e.status });
  }
}
