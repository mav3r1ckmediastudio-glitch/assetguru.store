import { derived, get, writable } from 'svelte/store';
import type { Asset, Category, Creator } from '$lib/data/marketplace';
import { platformSettings } from '$lib/stores/admin';

export type CataloguePage={
  assets:Asset[];
  categories:Category[];
  creators:Creator[];
  settings?:unknown;
  pagination:{page:number;pageSize:number;total:number;totalPages:number;hasMore:boolean};
  stats:{totalAssets:number;averageRating:number};
};

export const catalogueAssets = writable<Asset[]>([]);
export const catalogueCategories = writable<Category[]>([]);
export const catalogueCreators = writable<Creator[]>([]);
export const catalogueLoading = writable(false);
export const catalogueLoaded = writable(false);
export const catalogueTotal = writable(0);
export const catalogueAverageRating = writable(0);

export const featuredCatalogueAssets = derived(catalogueAssets, ($assets) =>
  $assets.filter((asset) => ['Featured','Bestseller','Top rated','New'].includes(asset.badge ?? '')).slice(0, 12)
);

export const topCatalogueCreators = derived(catalogueCreators, ($creators) =>
  [...$creators]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)
    .map((creator, index) => ({
      rank: index + 1,
      name: creator.name,
      slug: creator.slug,
      sales: creator.sales.toLocaleString('en-GB'),
      rating: creator.rating,
      avatar: creator.avatar
    }))
);

export async function fetchCataloguePage(params:URLSearchParams|string=''){
  const query=typeof params==='string'?params:params.toString();
  const response=await fetch(`/api/catalogue${query?`?${query}`:''}`);
  if(!response.ok)throw new Error('Catalogue request failed');
  return response.json() as Promise<CataloguePage>;
}

export async function loadCatalogue(force = false) {
  if (get(catalogueLoaded) && !force) return;
  catalogueLoading.set(true);
  try {
    const data=await fetchCataloguePage(new URLSearchParams({page:'1',pageSize:'24'}));
    catalogueAssets.update(existing=>{
      const merged=new Map((data.assets??[]).map(asset=>[asset.slug,asset]));
      for(const asset of existing)if(!merged.has(asset.slug))merged.set(asset.slug,asset);
      return [...merged.values()];
    });
    catalogueCategories.set(data.categories ?? []);
    catalogueCreators.set(data.creators ?? []);
    catalogueTotal.set(data.stats?.totalAssets ?? data.pagination?.total ?? data.assets?.length ?? 0);
    catalogueAverageRating.set(data.stats?.averageRating ?? 0);
    if (data.settings) platformSettings.set(data.settings as any);
    catalogueLoaded.set(true);
  } finally {
    catalogueLoading.set(false);
  }
}

export async function ensureCatalogueAssets(slugs:string[]){
  const wanted=[...new Set(slugs.filter(Boolean))];
  if(!wanted.length)return;
  const existing=new Set(get(catalogueAssets).map(asset=>asset.slug));
  const missing=wanted.filter(slug=>!existing.has(slug));
  if(!missing.length)return;
  const params=new URLSearchParams({includeMeta:'0',pageSize:String(Math.min(100,missing.length))});
  for(const slug of missing)params.append('slug',slug);
  const data=await fetchCataloguePage(params);
  catalogueAssets.update(items=>{
    const merged=new Map(items.map(item=>[item.slug,item]));
    for(const asset of data.assets??[])merged.set(asset.slug,asset);
    return [...merged.values()];
  });
}
