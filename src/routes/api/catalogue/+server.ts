import { json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabase';
import { loadPublicCatalogue, type CatalogueQueryOptions } from '$lib/server/loaders';

const CACHE_HEADERS={
  'cache-control':'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
};

function splitValues(values:string[]){
  return values.flatMap(value=>value.split(',')).map(value=>value.trim()).filter(Boolean);
}

export async function GET({url}:import('./$types').RequestEvent){
  try{
    const priceValue=url.searchParams.get('price');
    const sortValue=url.searchParams.get('sort');
    const options:CatalogueQueryOptions={
      page:Number(url.searchParams.get('page')??1),
      pageSize:Number(url.searchParams.get('pageSize')??24),
      search:url.searchParams.get('q')??'',
      categories:splitValues(url.searchParams.getAll('category')),
      price:['free','under-15','15-25','25-plus'].includes(priceValue??'')?priceValue as CatalogueQueryOptions['price']:undefined,
      minimumRating:Number(url.searchParams.get('rating')??0)||undefined,
      maxVersion:url.searchParams.get('version')??undefined,
      sourceFilesOnly:url.searchParams.get('sourceFiles')==='1',
      sort:['trending','newest','top-rated','price-low','price-high'].includes(sortValue??'')?sortValue as CatalogueQueryOptions['sort']:undefined,
      slugs:splitValues(url.searchParams.getAll('slug')).slice(0,100),
      includeMeta:url.searchParams.get('includeMeta')!=='0'
    };
    return json(await loadPublicCatalogue(getSupabaseAdmin(),options),{headers:CACHE_HEADERS});
  }catch(error){
    console.error('Public catalogue request failed',error);
    return json({message:'The marketplace catalogue is temporarily unavailable.'},{status:500,headers:{'cache-control':'no-store'}});
  }
}
