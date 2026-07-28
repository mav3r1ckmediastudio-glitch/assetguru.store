import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';
import { loadVendorOrders } from '$lib/server/vendor-loaders';
export async function GET({locals,url}:import('./$types').RequestEvent){try{const {user}=await requireRole(locals,['vendor']);return json(await loadVendorOrders(getSupabaseAdmin(),user.id,Number(url.searchParams.get('page')??1),Number(url.searchParams.get('pageSize')??25)));}catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}}
