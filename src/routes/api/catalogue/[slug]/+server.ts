import { json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabase';
import { loadPublicProduct } from '$lib/server/loaders';

export async function GET({params}:import('./$types').RequestEvent){
  try{
    const product=await loadPublicProduct(getSupabaseAdmin(),params.slug);
    if(!product)return json({message:'Product not found.'},{status:404,headers:{'cache-control':'public, max-age=15, s-maxage=30'}});
    return json(product,{headers:{'cache-control':'public, max-age=30, s-maxage=60, stale-while-revalidate=300'}});
  }catch(error){
    console.error('Public product request failed',error);
    return json({message:'This product is temporarily unavailable.'},{status:500,headers:{'cache-control':'no-store'}});
  }
}
