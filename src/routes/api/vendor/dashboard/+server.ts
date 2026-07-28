import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';
import { loadVendorDashboard } from '$lib/server/vendor-loaders';
export async function GET({locals}:import('./$types').RequestEvent){try{const {user}=await requireRole(locals,['vendor']);return json(await loadVendorDashboard(getSupabaseAdmin(),user.id));}catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}}
