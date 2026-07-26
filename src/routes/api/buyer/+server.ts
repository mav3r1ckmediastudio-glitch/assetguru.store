import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireUser } from '$lib/server/supabase';
import { loadBuyer } from '$lib/server/loaders';
export async function GET({locals}:import('./$types').RequestEvent){try{const user=await requireUser(locals);return json(await loadBuyer(getSupabaseAdmin(),user.id));}catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}}
