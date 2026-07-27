import { derived, writable } from 'svelte/store';
import type { Asset, Category, Creator } from '$lib/data/marketplace';
import { platformSettings } from '$lib/stores/admin';

export const catalogueAssets = writable<Asset[]>([]);
export const catalogueCategories = writable<Category[]>([]);
export const catalogueCreators = writable<Creator[]>([]);
export const catalogueLoading = writable(false);
export const catalogueLoaded = writable(false);

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

export async function loadCatalogue(force = false) {
  let loaded = false;
  catalogueLoaded.subscribe((value) => loaded = value)();
  if (loaded && !force) return;
  catalogueLoading.set(true);
  try {
    const response = await fetch(`/api/catalogue?refresh=${Date.now()}`, { cache:'no-store' });
    if (!response.ok) throw new Error('Catalogue request failed');
    const data = await response.json();
    catalogueAssets.set(data.assets ?? []);
    catalogueCategories.set(data.categories ?? []);
    catalogueCreators.set(data.creators ?? []);
    if (data.settings) platformSettings.set(data.settings);
    catalogueLoaded.set(true);
  } finally {
    catalogueLoading.set(false);
  }
}
