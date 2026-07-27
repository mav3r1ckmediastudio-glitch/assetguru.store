import { json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabase';
import { loadPublicCatalogue } from '$lib/server/loaders';

export async function GET(){
  try{
    return json(await loadPublicCatalogue(getSupabaseAdmin()),{
      headers:{
        'cache-control':'private, no-store, no-cache, max-age=0, must-revalidate'
      }
    });
  }catch(error){
    console.error(error);
    return json({message:'The marketplace catalogue is temporarily unavailable.'},{status:500});
  }
}
