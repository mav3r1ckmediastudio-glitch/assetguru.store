import { json } from '@sveltejs/kit';
import { apiError, requireRole } from '$lib/server/supabase';
import { publicR2Failure, runR2ServerHealthCheck } from '$lib/server/r2-health';

export async function POST({ locals }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const result = await runR2ServerHealthCheck(user.id);
    return json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const auth = apiError(error);
    if (auth.status === 401 || auth.status === 403) {
      return json({ ok: false, code: auth.status === 401 ? 'AUTH_REQUIRED' : 'FORBIDDEN', message: auth.message }, { status: auth.status });
    }
    const safe = publicR2Failure(error);
    console.error('R2 server health check failed', { code: safe.code, details: safe.details });
    return json({ ok: false, ...safe }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
