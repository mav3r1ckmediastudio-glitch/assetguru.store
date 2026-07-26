import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';
import { loadAdmin } from '$lib/server/loaders';
export async function GET({locals}:import('./$types').RequestEvent){try{await requireRole(locals,['admin']);return json(await loadAdmin(getSupabaseAdmin()));}catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}}
