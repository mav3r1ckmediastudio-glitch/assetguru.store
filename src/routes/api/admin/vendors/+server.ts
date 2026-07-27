import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';
import { loadVendorApplications } from '$lib/server/loaders';

export async function GET({ locals }: import('./$types').RequestEvent) {
  try {
    await requireRole(locals, ['admin']);
    const result = await loadVendorApplications(getSupabaseAdmin());
    return json({ vendors:result.vendors, warnings:result.warnings }, { headers:{ 'cache-control':'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin vendor list failed', error);
    const e = apiError(error);
    return json({ message:e.message }, { status:e.status });
  }
}
