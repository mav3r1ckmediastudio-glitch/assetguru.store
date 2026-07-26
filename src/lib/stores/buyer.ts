import { derived, writable } from 'svelte/store';
import { apiRequest } from '$lib/api';
import { getAsset, type Asset } from '$lib/data/marketplace';
import { defaultBuyerProfile, type BuyerProfile, type BuyerOrder, type BuyerReview, type DownloadEvent, type SupportTicket } from '$lib/data/buyer';
import { hydrateFavourites, showToast } from '$lib/stores/marketplace';

export const buyerProfile = writable<BuyerProfile>(defaultBuyerProfile);
export const buyerOrders = writable<BuyerOrder[]>([]);
export const buyerReviews = writable<BuyerReview[]>([]);
export const supportTickets = writable<SupportTicket[]>([]);
export const downloadHistory = writable<DownloadEvent[]>([]);
export const dismissedUpdates = writable<string[]>([]);
export const buyerNotifications = writable<any[]>([]);
export const buyerLoaded = writable(false);

export type BuyerEntitlement = {
  slug: string;
  licence: 'standard' | 'extended';
  purchasedVersion: string;
  purchasedAt: string;
  orderId: string;
  versionId?: string;
};

export type BuyerEntitlementWithAsset = BuyerEntitlement & { asset: Asset };
export type BuyerAvailableUpdate = BuyerEntitlementWithAsset & { latestVersion: string };

export const entitlements = derived(buyerOrders, ($orders): BuyerEntitlement[] => {
  const owned = new Map<string, BuyerEntitlement>();
  for (const order of [...$orders].sort((a,b)=>b.timestamp-a.timestamp)) {
    if (!['Complete','Partially refunded'].includes(order.status)) continue;
    for (const item of order.items) {
      if (!item.refunded && !owned.has(item.slug)) {
        owned.set(item.slug, {
          slug: item.slug,
          licence: item.licence,
          purchasedVersion: item.version,
          purchasedAt: order.date,
          orderId: order.id,
          versionId: item.versionId
        });
      }
    }
  }
  return [...owned.values()];
});

export const availableUpdates = derived(
  [entitlements, dismissedUpdates],
  ([$entitlements, $dismissed]): BuyerAvailableUpdate[] => {
    const updates: BuyerAvailableUpdate[] = [];
    for (const entry of $entitlements) {
      const asset = getAsset(entry.slug);
      if (!asset || asset.version === entry.purchasedVersion) continue;
      if ($dismissed.includes(`${entry.slug}:${asset.version}`)) continue;
      updates.push({ ...entry, latestVersion: asset.version, asset });
    }
    return updates;
  }
);

export const pendingReviewAssets = derived(
  [entitlements, buyerReviews],
  ([$entitlements, $reviews]): BuyerEntitlementWithAsset[] => {
    const reviewed = new Set($reviews.map((review) => review.slug));
    const pending: BuyerEntitlementWithAsset[] = [];
    for (const entry of $entitlements) {
      if (reviewed.has(entry.slug)) continue;
      const asset = getAsset(entry.slug);
      if (asset) pending.push({ ...entry, asset });
    }
    return pending;
  }
);

export async function loadBuyerData(force=false) {
  let loaded=false; buyerLoaded.subscribe(v=>loaded=v)(); if(loaded&&!force)return;
  const data=await apiRequest<any>('/api/buyer');
  buyerProfile.set(data.profile ?? defaultBuyerProfile);
  buyerOrders.set(data.orders ?? []);
  buyerReviews.set(data.reviews ?? []);
  supportTickets.set(data.tickets ?? []);
  downloadHistory.set(data.downloads ?? []);
  buyerNotifications.set(data.notifications ?? []);
  hydrateFavourites(data.favourites ?? []);
  buyerLoaded.set(true);
}

export async function recordDownload(slug:string, version:string) {
  try {
    const data=await apiRequest<{url:string; downloadedAt:string}>('/api/download',{method:'POST',body:JSON.stringify({slug,version})});
    downloadHistory.update(items=>[{slug,version,downloadedAt:data.downloadedAt},...items]);
    window.location.assign(data.url);
  } catch(error) { showToast(error instanceof Error?error.message:'Download could not be prepared','warning'); }
}
export async function submitReview(review:Omit<BuyerReview,'submitted'>) {
  try { const data=await apiRequest<{review:BuyerReview}>('/api/reviews',{method:'POST',body:JSON.stringify(review)}); buyerReviews.update(items=>[data.review,...items.filter(i=>i.slug!==review.slug)]); showToast('Review published','success'); }
  catch(error){showToast(error instanceof Error?error.message:'Review could not be submitted','warning');}
}
export async function requestRefund(orderId:string, slug:string, reason:string) {
  try { await apiRequest('/api/refunds',{method:'POST',body:JSON.stringify({orderId,slug,reason})}); await loadBuyerData(true); showToast('Refund request created','success'); }
  catch(error){showToast(error instanceof Error?error.message:'Refund request failed','warning');}
}
export async function createSupportTicket(input:Omit<SupportTicket,'id'|'status'|'updated'>) {
  try { const data=await apiRequest<{ticket:SupportTicket}>('/api/support',{method:'POST',body:JSON.stringify(input)}); supportTickets.update(items=>[data.ticket,...items]); showToast('Support ticket created','success'); }
  catch(error){showToast(error instanceof Error?error.message:'Support ticket could not be created','warning');}
}
export function dismissUpdate(slug:string,version:string){dismissedUpdates.update(items=>[...new Set([...items,`${slug}:${version}`])]);}
export async function saveBuyerProfile(profile:BuyerProfile) {
  try { const data=await apiRequest<{profile:BuyerProfile;emailChangePending?:boolean}>('/api/profile',{method:'PATCH',body:JSON.stringify(profile)}); buyerProfile.set(data.profile); showToast(data.emailChangePending?'Account saved. Confirm the new email address from your inbox.':'Account settings saved','success'); }
  catch(error){showToast(error instanceof Error?error.message:'Account settings could not be saved','warning');}
}
