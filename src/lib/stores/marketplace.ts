import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { LicenceKey } from '$lib/data/marketplace';
import { apiRequest } from '$lib/api';

export type CartLine = { slug: string; licence: LicenceKey; };
export type Toast = { id:number; message:string; tone:'success'|'warning'|'info'; };

function readCart(): CartLine[] {
  if (!browser) return [];
  try { return JSON.parse(sessionStorage.getItem('assetguru-cart') ?? '[]'); } catch { return []; }
}

export const favourites = writable<string[]>([]);
export const cart = writable<CartLine[]>(readCart());
export const toasts = writable<Toast[]>([]);

if (browser) cart.subscribe((value) => sessionStorage.setItem('assetguru-cart', JSON.stringify(value)));

export const cartCount = derived(cart, ($cart) => $cart.length);

export function hydrateFavourites(slugs: string[]) { favourites.set(slugs); }

export async function toggleFavourite(slug: string, title?: string) {
  let active = false;
  favourites.update((items) => {
    active = !items.includes(slug);
    return active ? [...items, slug] : items.filter((item) => item !== slug);
  });
  try {
    await apiRequest('/api/favourites', { method: active ? 'POST' : 'DELETE', body: JSON.stringify({ slug }) });
    showToast(active ? `${title ?? 'Asset'} saved` : `${title ?? 'Asset'} removed`, active ? 'success' : 'info');
  } catch (error) {
    favourites.update((items) => active ? items.filter((item) => item !== slug) : [...items, slug]);
    showToast(error instanceof Error ? error.message : 'Could not update favourites', 'warning');
  }
}

export function addToCart(slug: string, licence: LicenceKey = 'standard', title?: string) {
  let added = false;
  cart.update((items) => {
    if (items.some((item) => item.slug === slug)) return items.map((item) => item.slug === slug ? { ...item, licence } : item);
    added = true;
    return [...items, { slug, licence }];
  });
  showToast(added ? `${title ?? 'Asset'} added to basket` : `${title ?? 'Asset'} licence updated`, 'success');
}
export function removeFromCart(slug: string) { cart.update((items) => items.filter((item) => item.slug !== slug)); }
export function updateCartLicence(slug: string, licence: LicenceKey) { cart.update((items) => items.map((item) => item.slug === slug ? { ...item, licence } : item)); }
export function clearCart() { cart.set([]); }
export function showToast(message: string, tone: Toast['tone'] = 'info') {
  const id = Date.now() + Math.floor(Math.random()*1000);
  toasts.update((items) => [...items, { id, message, tone }]);
  if (browser) window.setTimeout(() => toasts.update((items) => items.filter((item) => item.id !== id)), 3200);
}
