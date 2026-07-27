import { derived, get, writable } from 'svelte/store';
import { apiRequest } from '$lib/api';
import { defaultPlatformSettings,emptyAdminMetrics,type AdminCase,type AdminCategoryReport,type AdminMetrics,type AuditEvent,type CaseStatus,type CatalogueCategory,type ModerationItem,type ModerationStatus,type PlatformSettings,type VendorApplication,type VendorStatus } from '$lib/data/admin';
import { showToast } from '$lib/stores/marketplace';

export const adminMetrics=writable<AdminMetrics>(emptyAdminMetrics);
export const adminReportCategories=writable<AdminCategoryReport[]>([]);
export const moderationQueue=writable<ModerationItem[]>([]);
export const vendorApplications=writable<VendorApplication[]>([]);
export const adminCases=writable<AdminCase[]>([]);
export const catalogueCategories=writable<CatalogueCategory[]>([]);
export const platformSettings=writable<PlatformSettings>(defaultPlatformSettings);
export const auditEvents=writable<AuditEvent[]>([]);
export const adminRevenueSeries=writable<number[]>([]);
export const adminOrderSeries=writable<number[]>([]);
export const adminLoaded=writable(false);
export const adminLoading=writable(false);
export const adminLoadError=writable<string|null>(null);

let adminLoadGeneration=0;

export const adminCounts=derived([moderationQueue,vendorApplications,adminCases],([$m,$v,$c])=>({moderation:$m.filter(i=>i.status==='Queued'||i.status==='In review').length,vendors:$v.filter(i=>i.status==='Pending'||i.status==='More information').length,cases:$c.filter(i=>i.status==='Open'||i.status==='Investigating').length,urgent:$c.filter(i=>i.priority==='Urgent'&&i.status!=='Resolved'&&i.status!=='Declined').length}));

export function resetAdminData(){
  adminLoadGeneration+=1;
  adminMetrics.set(emptyAdminMetrics);
  adminReportCategories.set([]);
  moderationQueue.set([]);
  vendorApplications.set([]);
  adminCases.set([]);
  catalogueCategories.set([]);
  platformSettings.set(defaultPlatformSettings);
  auditEvents.set([]);
  adminRevenueSeries.set([]);
  adminOrderSeries.set([]);
  adminLoaded.set(false);
  adminLoading.set(false);
  adminLoadError.set(null);
}

export async function loadAdminData(force=false){
  if(get(adminLoaded)&&!force)return;
  const generation=++adminLoadGeneration;
  adminLoading.set(true);
  adminLoadError.set(null);
  try{
    const d=await apiRequest<any>('/api/admin');
    if(generation!==adminLoadGeneration)return;
    moderationQueue.set(d.moderation??[]);
    vendorApplications.set(d.vendors??[]);
    adminCases.set(d.cases??[]);
    catalogueCategories.set(d.categories??[]);
    platformSettings.set(d.settings??defaultPlatformSettings);
    auditEvents.set(d.audit??[]);
    adminRevenueSeries.set(d.revenueSeries??[]);
    adminOrderSeries.set(d.orderSeries??[]);
    adminMetrics.set(d.metrics??emptyAdminMetrics);
    adminReportCategories.set(d.reportCategories??[]);
    adminLoaded.set(true);
  }catch(error){
    if(generation===adminLoadGeneration){
      adminLoaded.set(false);
      adminLoadError.set(error instanceof Error?error.message:'Administration data could not be loaded');
    }
    throw error;
  }finally{
    if(generation===adminLoadGeneration)adminLoading.set(false);
  }
}

export async function setModerationStatus(id:string,status:ModerationStatus,notes=''){try{await apiRequest(`/api/admin/moderation/${id}`,{method:'PATCH',body:JSON.stringify({status,notes})});moderationQueue.update(items=>items.map(i=>i.id===id?{...i,status,notes}:i));showToast(`Moderation item moved to ${status.toLowerCase()}`,'success');}catch(e){showToast(e instanceof Error?e.message:'Moderation action failed','warning');}}
export async function setVendorStatus(id:string,status:VendorStatus,reason=''){try{await apiRequest(`/api/admin/vendors/${id}`,{method:'PATCH',body:JSON.stringify({status,reason})});vendorApplications.update(items=>items.map(i=>i.id===id?{...i,status,reason}:i));showToast(`Vendor marked ${status.toLowerCase()}`,'success');}catch(e){showToast(e instanceof Error?e.message:'Vendor action failed','warning');}}
export async function setVendorCommission(id:string,commission:number){try{await apiRequest(`/api/admin/vendors/${id}`,{method:'PATCH',body:JSON.stringify({commission})});vendorApplications.update(items=>items.map(i=>i.id===id?{...i,commission}:i));showToast('Vendor commission updated','success');return true;}catch(e){showToast(e instanceof Error?e.message:'Commission update failed','warning');return false;}}
export async function setCaseStatus(id:string,status:CaseStatus){try{await apiRequest(`/api/admin/cases/${id}`,{method:'PATCH',body:JSON.stringify({status})});adminCases.update(items=>items.map(i=>i.id===id?{...i,status}:i));showToast(`Case marked ${status.toLowerCase()}`,'success');}catch(e){showToast(e instanceof Error?e.message:'Case action failed','warning');}}
export async function updateCategory(id:string,patch:Partial<CatalogueCategory>){try{await apiRequest(`/api/admin/categories/${id}`,{method:'PATCH',body:JSON.stringify(patch)});catalogueCategories.update(items=>items.map(i=>i.id===id?{...i,...patch}:i));showToast('Category updated','success');}catch(e){showToast(e instanceof Error?e.message:'Category update failed','warning');}}
export async function savePlatformSettings(next:PlatformSettings){try{const d=await apiRequest<{settings:PlatformSettings}>('/api/admin/settings',{method:'PATCH',body:JSON.stringify(next)});platformSettings.set(d.settings);showToast('Marketplace settings saved','success');}catch(e){showToast(e instanceof Error?e.message:'Settings could not be saved','warning');}}
export async function refreshAdminData(){showToast('Refreshing administration data…','info');await loadAdminData(true);showToast('Live administration data refreshed','success');}
