import type { PageServerLoad } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase';
import { loadPublicCatalogue } from '$lib/server/loaders';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  setHeaders({
    'cache-control': 'private, no-store, no-cache, max-age=0, must-revalidate'
  });

  const catalogue = await loadPublicCatalogue(getSupabaseAdmin());
  const creator = catalogue.creators.find((item) => item.slug === params.slug) ?? null;

  return {
    slug: params.slug,
    creator,
    creatorAssets: creator
      ? catalogue.assets.filter((asset) => asset.creatorSlug === creator.slug)
      : []
  };
};
