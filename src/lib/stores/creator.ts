import { get, writable } from 'svelte/store';
import { apiRequest } from '$lib/api';
import type { CreatorOrder, CreatorProduct, ProductStatus } from '$lib/data/creator';
import { showToast } from '$lib/stores/marketplace';

export type StorefrontSettings = {
  displayName:string;tagline:string;bio:string;supportEmail:string;responseTime:string;featuredSlug:string;
  accent:'cyan'|'violet'|'magenta';showSales:boolean;showFollowers:boolean;vacationMode:boolean;
  sections:Record<string,boolean>;supportPromise:string;updateCommitment:string;licenceNotes:string;
};
export type CreatorTotals={revenue:number;sales:number;views:number;published:number;pending:number};
export type CreatorProductCounts={all:number;published:number;inReview:number;changesRequired:number;drafts:number;retired:number};
export type PaginationState={page:number;pageSize:number;total:number;totalPages:number;hasMore:boolean};

const defaultCreatorProfile={name:'',handle:'',avatar:'',banner:'',tagline:'',rating:0,reviews:0,followers:0,responseTime:'',completion:0,commission:15,payoutSchedule:'',connectedAccount:'Not connected',tier:'NEW',status:'pending',hasAvatar:false,hasBanner:false};
const defaultStorefront:StorefrontSettings={displayName:'',tagline:'',bio:'',supportEmail:'',responseTime:'Within 2 business days',featuredSlug:'',accent:'cyan',showSales:true,showFollowers:true,vacationMode:false,sections:{hero:true,featured:true,bestsellers:true,latest:true,about:true},supportPromise:'',updateCommitment:'',licenceNotes:''};
const defaultTotals:CreatorTotals={revenue:0,sales:0,views:0,published:0,pending:0};
const defaultCounts:CreatorProductCounts={all:0,published:0,inReview:0,changesRequired:0,drafts:0,retired:0};
const defaultPagination:PaginationState={page:1,pageSize:24,total:0,totalPages:0,hasMore:false};

function normaliseStorefront(value:Partial<StorefrontSettings>|null|undefined):StorefrontSettings{return{...defaultStorefront,...(value??{}),displayName:value?.displayName??'',tagline:value?.tagline??'',bio:value?.bio??'',supportEmail:value?.supportEmail??'',responseTime:value?.responseTime||defaultStorefront.responseTime,featuredSlug:value?.featuredSlug??'',supportPromise:value?.supportPromise??'',updateCommitment:value?.updateCommitment??'',licenceNotes:value?.licenceNotes??'',sections:{...defaultStorefront.sections,...(value?.sections??{})}};}
export function calculateStorefrontCompletion(settings:StorefrontSettings,profile:any){return[settings.tagline,settings.bio,settings.supportEmail,settings.responseTime,profile?.hasAvatar,profile?.hasBanner].filter(Boolean).length/6*100;}

export const creatorProducts=writable<CreatorProduct[]>([]);
export const creatorOrders=writable<CreatorOrder[]>([]);
export const creatorProfile=writable<any>({...defaultCreatorProfile});
export const storefront=writable<StorefrontSettings>(normaliseStorefront(defaultStorefront));
export const creatorTotals=writable<CreatorTotals>({...defaultTotals});
export const creatorProductCounts=writable<CreatorProductCounts>({...defaultCounts});
export const creatorProductsPagination=writable<PaginationState>({...defaultPagination});
export const creatorOrdersPagination=writable<PaginationState>({...defaultPagination,pageSize:25});
export const revenueSeries=writable<number[]>([]);
export const salesSeries=writable<number[]>([]);
export const trafficSources=writable<any[]>([]);
export const payoutHistory=writable<any[]>([]);
export const reviewQueue=writable<any[]>([]);
export const creatorLoaded=writable(false);
export const creatorLoading=writable(false);
export const creatorLoadError=writable<string|null>(null);
export const creatorSectionLoading=writable<Record<string,boolean>>({});

let creatorLoadGeneration=0;
let creatorLoadPromise:Promise<void>|null=null;
let creatorSectionGeneration:Record<string,number>={};
function setSectionLoading(section:string,value:boolean){creatorSectionLoading.update((state)=>({...state,[section]:value}));}

export function resetCreatorData(){creatorLoadGeneration+=1;creatorLoadPromise=null;creatorProducts.set([]);creatorOrders.set([]);creatorProfile.set({...defaultCreatorProfile});storefront.set(normaliseStorefront(defaultStorefront));creatorTotals.set({...defaultTotals});creatorProductCounts.set({...defaultCounts});creatorProductsPagination.set({...defaultPagination});creatorOrdersPagination.set({...defaultPagination,pageSize:25});revenueSeries.set([]);salesSeries.set([]);trafficSources.set([]);payoutHistory.set([]);reviewQueue.set([]);creatorLoaded.set(false);creatorLoading.set(false);creatorLoadError.set(null);creatorSectionLoading.set({});}

export async function loadCreatorData(force=false){
  if(get(creatorLoaded)&&!force)return;
  if(creatorLoadPromise&&!force)return creatorLoadPromise;
  const generation=++creatorLoadGeneration;
  const operation=(async()=>{
    creatorLoading.set(true);creatorLoadError.set(null);
    try{
      const data=await apiRequest<any>('/api/vendor',{cache:'no-store'});
      if(generation!==creatorLoadGeneration)return;
      creatorProfile.set({...defaultCreatorProfile,...(data.profile??{})});
      storefront.set(normaliseStorefront(data.storefront));
      creatorProductCounts.set({...defaultCounts,...(data.counts??{})});
      creatorTotals.update((current)=>({...current,published:Number(data.totals?.published??0),pending:Number(data.totals?.pending??0)}));
      creatorLoaded.set(true);
    }catch(error){
      if(generation===creatorLoadGeneration){creatorLoaded.set(false);creatorLoadError.set(error instanceof Error?error.message:'Creator data could not be loaded');}
      throw error;
    }finally{if(generation===creatorLoadGeneration)creatorLoading.set(false);}
  })();
  creatorLoadPromise=operation;
  try{await operation;}finally{if(creatorLoadPromise===operation)creatorLoadPromise=null;}
}

async function loadCreatorSection<T>(section:string,request:()=>Promise<T>,apply:(data:T)=>void){
  const sectionGeneration=(creatorSectionGeneration[section]??0)+1;creatorSectionGeneration[section]=sectionGeneration;setSectionLoading(section,true);
  try{
    for(let attempt=0;attempt<3;attempt+=1){
      await loadCreatorData();
      const accountGeneration=creatorLoadGeneration;
      const data=await request();
      if(sectionGeneration!==creatorSectionGeneration[section])return data;
      if(accountGeneration!==creatorLoadGeneration)continue;
      apply(data);return data;
    }
    throw new Error('Creator account changed while this section was loading. Refresh and try again.');
  }finally{if(sectionGeneration===creatorSectionGeneration[section])setSectionLoading(section,false);}
}

export async function loadCreatorDashboard(){return loadCreatorSection<any>('dashboard',()=>apiRequest<any>('/api/vendor/dashboard',{cache:'no-store'}),(data)=>{creatorProducts.set(data.products??[]);creatorOrders.set(data.orders??[]);payoutHistory.set(data.payouts??[]);revenueSeries.set(data.revenueSeries??[]);salesSeries.set(data.salesSeries??[]);trafficSources.set(data.trafficSources??[]);reviewQueue.set(data.reviews??[]);creatorTotals.set({...defaultTotals,...(data.totals??{})});});}

export async function loadCreatorProducts(options:{page?:number;pageSize?:number;search?:string;status?:ProductStatus|'All';sort?:string;append?:boolean}={}){
  const params=new URLSearchParams({page:String(options.page??1),pageSize:String(options.pageSize??24),sort:options.sort??'Recently updated'});if(options.search?.trim())params.set('search',options.search.trim());if(options.status&&options.status!=='All')params.set('status',options.status);
  return loadCreatorSection<any>('products',()=>apiRequest<any>(`/api/vendor/products?${params}`,{cache:'no-store'}),(data)=>{creatorProducts.update((items)=>options.append?[...items,...(data.products??[]).filter((next:CreatorProduct)=>!items.some((item)=>item.slug===next.slug))]:(data.products??[]));creatorProductCounts.set({...defaultCounts,...(data.counts??{})});creatorProductsPagination.set({...defaultPagination,...(data.pagination??{})});});
}

export async function loadCreatorProduct(slug:string){const data=await loadCreatorSection<{product:CreatorProduct}>('product',()=>apiRequest<{product:CreatorProduct}>(`/api/vendor/products/${encodeURIComponent(slug)}`,{cache:'no-store'}),(result)=>creatorProducts.update((items)=>[result.product,...items.filter((item)=>item.slug!==result.product.slug)]));return data.product;}

export async function loadCreatorProductOptions(){return loadCreatorSection<CreatorProduct[]>('productOptions',async()=>{let page=1;let all:CreatorProduct[]=[];while(page<=20){const params=new URLSearchParams({page:String(page),pageSize:'48',status:'Published',sort:'Title'});const data=await apiRequest<any>(`/api/vendor/products?${params}`,{cache:'no-store'});all=[...all,...(data.products??[])];if(!data.pagination?.hasMore)break;page+=1;}return all;},(all)=>creatorProducts.set(all));}

export async function loadCreatorOrders(page=1,append=false){return loadCreatorSection<any>('orders',()=>apiRequest<any>(`/api/vendor/orders?page=${page}&pageSize=25`,{cache:'no-store'}),(data)=>{creatorOrders.update((items)=>append?[...items,...(data.orders??[])]:data.orders??[]);creatorOrdersPagination.set({...defaultPagination,pageSize:25,...(data.pagination??{})});});}
export async function loadCreatorAnalytics(){return loadCreatorSection<any>('analytics',()=>apiRequest<any>('/api/vendor/analytics',{cache:'no-store'}),(data)=>{creatorProducts.set(data.products??[]);creatorTotals.set({...defaultTotals,...(data.totals??{})});revenueSeries.set(data.revenueSeries??[]);salesSeries.set(data.salesSeries??[]);trafficSources.set(data.trafficSources??[]);});}
export async function loadCreatorPayouts(){return loadCreatorSection<any>('payouts',()=>apiRequest<any>('/api/vendor/payouts',{cache:'no-store'}),(data)=>payoutHistory.set(data.payouts??[]));}

export async function setProductStatus(slug:string,status:ProductStatus){try{await apiRequest(`/api/vendor/products/${slug}`,{method:'PATCH',body:JSON.stringify({status})});creatorProducts.update((items)=>items.map((item)=>item.slug===slug?{...item,status,updated:'Just now'}:item));void loadCreatorData(true);showToast(`Product moved to ${status.toLowerCase()}`,'success');return true;}catch(error){showToast(error instanceof Error?error.message:'Product could not be updated','warning');return false;}}
export async function updateCreatorProduct(slug:string,patch:Partial<CreatorProduct>){try{const data=await apiRequest<{product:CreatorProduct}>(`/api/vendor/products/${slug}`,{method:'PATCH',body:JSON.stringify(patch)});creatorProducts.update((items)=>items.map((item)=>item.slug===slug?{...item,...data.product}:item));showToast('Product changes saved','success');return data.product;}catch(error){showToast(error instanceof Error?error.message:'Product could not be updated','warning');return null;}}
export async function removeCreatorProduct(slug:string){try{await apiRequest(`/api/vendor/products/${slug}`,{method:'DELETE'});creatorProducts.update((items)=>items.filter((item)=>item.slug!==slug));void loadCreatorData(true);showToast('Listing and uploaded files deleted','info');return true;}catch(error){showToast(error instanceof Error?error.message:'Listing could not be deleted','warning');return false;}}
export async function addCreatorDraft(product:CreatorProduct|FormData){try{const init:RequestInit={method:'POST',body:product instanceof FormData?product:JSON.stringify(product)};const data=await apiRequest<{product:CreatorProduct}>('/api/vendor/products',init);creatorProducts.update((items)=>[data.product,...items.filter((item)=>item.slug!==data.product.slug)]);void loadCreatorData(true);showToast(`${data.product.title} saved`,'success');return data.product;}catch(error){showToast(error instanceof Error?error.message:'Product could not be saved','warning');return null;}}

export async function updateStorefront(next:StorefrontSettings){const pending=normaliseStorefront(next);showToast('Saving storefront…','info');try{const data=await apiRequest<{storefront:StorefrontSettings}>('/api/vendor/storefront',{method:'PATCH',body:JSON.stringify(pending)});const saved=normaliseStorefront(data.storefront);storefront.set(saved);creatorProfile.update((profile)=>({...profile,name:saved.displayName,tagline:saved.tagline,responseTime:saved.responseTime,completion:calculateStorefrontCompletion(saved,profile)}));showToast('Storefront changes saved','success');return saved;}catch(error){showToast(error instanceof Error?error.message:'Storefront could not be saved','warning');return null;}}
export async function connectStripe(){try{const data=await apiRequest<{url:string}>('/api/stripe/connect',{method:'POST',body:'{}'});window.location.assign(data.url);}catch(error){showToast(error instanceof Error?error.message:'Stripe onboarding could not start','warning');}}
