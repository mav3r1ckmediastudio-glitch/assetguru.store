import { json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabase';
import { loadPublicCatalogue } from '$lib/server/loaders';
export async function GET(){try{return json(await loadPublicCatalogue(getSupabaseAdmin()),{headers:{'cache-control':'public, max-age=60, s-maxage=300'}});}catch(error){console.error(error);return json({message:'The marketplace catalogue is temporarily unavailable.'},{status:500});}}
