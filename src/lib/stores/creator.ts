import { derived, get, writable } from 'svelte/store';
import { apiRequest } from '$lib/api';
import type { CreatorOrder, CreatorProduct, ProductStatus } from '$lib/data/creator';
import { showToast } from '$lib/stores/marketplace';

export type StorefrontSettings = {
  displayName:string;
  tagline:string;
  bio:string;
  supportEmail:string;
  responseTime:string;
  featuredSlug:string;
  accent:'cyan'|'violet'|'magenta';
  showSales:boolean;
  showFollowers:boolean;
  vacationMode:boolean;
  sections:Record<string,boolean>;
  supportPromise:string;
  updateCommitment:string;
  licenceNotes:string;
};

const defaultCreatorProfile = {
  name:'Creator',handle:'',avatar:'/favicon.svg',banner:'/images/hero-city.webp',tagline:'',rating:0,reviews:0,followers:0,
  responseTime:'',completion:0,commission:15,payoutSchedule:'',connectedAccount:'Not connected',tier:'NEW',status:'pending',
  hasAvatar:false,hasBanner:false
};

const defaultStorefront:StorefrontSettings = {
  displayName:'',tagline:'',bio:'',supportEmail:'',responseTime:'Within 2 business days',featuredSlug:'',accent:'cyan',
  showSales:true,showFollowers:true,vacationMode:false,
  sections:{hero:true,featured:true,bestsellers:true,latest:true,about:true},
  supportPromise:'',updateCommitment:'',licenceNotes:''
};

function normaliseStorefront(value:Partial<StorefrontSettings>|null|undefined):StorefrontSettings {
  return {
    ...defaultStorefront,
    ...(value ?? {}),
    displayName:value?.displayName ?? '',
    tagline:value?.tagline ?? '',
    bio:value?.bio ?? '',
    supportEmail:value?.supportEmail ?? '',
    responseTime:value?.responseTime || defaultStorefront.responseTime,
    featuredSlug:value?.featuredSlug ?? '',
    supportPromise:value?.supportPromise ?? '',
    updateCommitment:value?.updateCommitment ?? '',
    licenceNotes:value?.licenceNotes ?? '',
    sections:{...defaultStorefront.sections,...(value?.sections ?? {})}
  };
}

export function calculateStorefrontCompletion(settings:StorefrontSettings, profile:any) {
  return [settings.tagline,settings.bio,settings.supportEmail,settings.responseTime,profile?.hasAvatar,profile?.hasBanner].filter(Boolean).length/6*100;
}

export const creatorProducts=writable<CreatorProduct[]>([]);
export const creatorOrders=writable<CreatorOrder[]>([]);
export const creatorProfile=writable<any>({...defaultCreatorProfile});
export const storefront=writable<StorefrontSettings>(normaliseStorefront(defaultStorefront));
export const revenueSeries=writable<number[]>([]);
export const salesSeries=writable<number[]>([]);
export const trafficSources=writable<any[]>([]);
export const payoutHistory=writable<any[]>([]);
export const reviewQueue=writable<any[]>([]);
export const creatorLoaded=writable(false);
export const creatorLoading=writable(false);
export const creatorLoadError=writable<string|null>(null);

let creatorLoadGeneration=0;

export const publishedProducts=derived(creatorProducts,$products=>$products.filter(i=>i.status==='Published'));
export const creatorTotals=derived(creatorProducts,$products=>({revenue:$products.reduce((s,i)=>s+i.revenue,0),sales:$products.reduce((s,i)=>s+i.sales,0),views:$products.reduce((s,i)=>s+i.views,0),published:$products.filter(i=>i.status==='Published').length,pending:$products.filter(i=>i.status==='In review'||i.status==='Changes required').length}));

export function resetCreatorData(){
  creatorLoadGeneration+=1;
  creatorProducts.set([]);
  creatorOrders.set([]);
  creatorProfile.set({...defaultCreatorProfile});
  storefront.set(normaliseStorefront(defaultStorefront));
  revenueSeries.set([]);
  salesSeries.set([]);
  trafficSources.set([]);
  payoutHistory.set([]);
  reviewQueue.set([]);
  creatorLoaded.set(false);
  creatorLoading.set(false);
  creatorLoadError.set(null);
}

export async function loadCreatorData(force=false){
  if(get(creatorLoaded)&&!force)return;
  const generation=++creatorLoadGeneration;
  creatorLoading.set(true);
  creatorLoadError.set(null);
  try{
    const d=await apiRequest<any>('/api/vendor');
    if(generation!==creatorLoadGeneration)return;
    creatorProducts.set(d.products??[]);
    creatorOrders.set(d.orders??[]);
    creatorProfile.set({...defaultCreatorProfile,...(d.profile??{})});
    storefront.set(normaliseStorefront(d.storefront));
    revenueSeries.set(d.revenueSeries??[]);
    salesSeries.set(d.salesSeries??[]);
    trafficSources.set(d.trafficSources??[]);
    payoutHistory.set(d.payouts??[]);
    reviewQueue.set(d.reviews??[]);
    creatorLoaded.set(true);
  }catch(error){
    if(generation===creatorLoadGeneration){
      creatorLoaded.set(false);
      creatorLoadError.set(error instanceof Error?error.message:'Creator data could not be loaded');
    }
    throw error;
  }finally{
    if(generation===creatorLoadGeneration)creatorLoading.set(false);
  }
}

export async function setProductStatus(slug:string,status:ProductStatus){try{await apiRequest(`/api/vendor/products/${slug}`,{method:'PATCH',body:JSON.stringify({status})});creatorProducts.update(items=>items.map(i=>i.slug===slug?{...i,status,updated:'Just now'}:i));showToast(`Product moved to ${status.toLowerCase()}`,'success');}catch(e){showToast(e instanceof Error?e.message:'Product could not be updated','warning');}}
export async function updateCreatorProduct(slug:string,patch:Partial<CreatorProduct>){try{const d=await apiRequest<{product:CreatorProduct}>(`/api/vendor/products/${slug}`,{method:'PATCH',body:JSON.stringify(patch)});creatorProducts.update(items=>items.map(i=>i.slug===slug?{...i,...d.product}:i));showToast('Product changes saved','success');}catch(e){showToast(e instanceof Error?e.message:'Product could not be updated','warning');}}
export async function removeCreatorProduct(slug:string){try{await apiRequest(`/api/vendor/products/${slug}`,{method:'DELETE'});creatorProducts.update(items=>items.filter(i=>i.slug!==slug));showToast('Draft removed','info');}catch(e){showToast(e instanceof Error?e.message:'Draft could not be removed','warning');}}
export async function addCreatorDraft(product:CreatorProduct|FormData){try{const init:RequestInit={method:'POST',body:product instanceof FormData?product:JSON.stringify(product)};const d=await apiRequest<{product:CreatorProduct}>('/api/vendor/products',init);creatorProducts.update(items=>[d.product,...items.filter(i=>i.slug!==d.product.slug)]);showToast(`${d.product.title} saved`,'success');return d.product;}catch(e){showToast(e instanceof Error?e.message:'Product could not be saved','warning');return null;}}

export async function updateStorefront(next:StorefrontSettings){
  const pending=normaliseStorefront(next);
  showToast('Saving storefront…','info');
  try{
    const d=await apiRequest<{storefront:StorefrontSettings}>('/api/vendor/storefront',{method:'PATCH',body:JSON.stringify(pending)});
    const saved=normaliseStorefront(d.storefront);
    storefront.set(saved);
    creatorProfile.update(profile=>({
      ...profile,
      name:saved.displayName,
      tagline:saved.tagline,
      responseTime:saved.responseTime,
      completion:calculateStorefrontCompletion(saved,profile)
    }));
    showToast('Storefront changes saved','success');
    return saved;
  }catch(e){
    showToast(e instanceof Error?e.message:'Storefront could not be saved','warning');
    return null;
  }
}

export async function connectStripe(){try{const d=await apiRequest<{url:string}>('/api/stripe/connect',{method:'POST',body:'{}'});window.location.assign(d.url);}catch(e){showToast(e instanceof Error?e.message:'Stripe onboarding could not start','warning');}}
