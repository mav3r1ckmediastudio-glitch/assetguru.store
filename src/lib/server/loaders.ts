import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, Category, Creator } from '$lib/data/marketplace';
import type { BuyerOrder, BuyerProfile, BuyerReview, DownloadEvent, SupportTicket } from '$lib/data/buyer';
import type { CreatorOrder, CreatorProduct } from '$lib/data/creator';
import type { AdminCase, AdminCategoryReport, AdminMetrics, AuditEvent, CatalogueCategory, ModerationItem, PlatformSettings, VendorApplication } from '$lib/data/admin';
import { defaultPlatformSettings } from '$lib/data/admin';

const dateLong = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value)) : '';
const dateShort = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)) : '';
const dateTimeShort = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '';
const pounds = (pence?: number | null) => Number(((pence ?? 0) / 100).toFixed(2));
const initials = (name='') => name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('') || 'AG';
const bytes = (size?: number | null) => {
  const value=Number(size??0); if(!value)return '0 MB';
  const units=['B','KB','MB','GB','TB']; const index=Math.min(Math.floor(Math.log(value)/Math.log(1024)),units.length-1);
  return `${(value/1024**index).toFixed(index>2?1:0)} ${units[index]}`;
};
const productStatus = (status:string):CreatorProduct['status'] => ({published:'Published',draft:'Draft',in_review:'In review',changes_requested:'Changes required',retired:'Retired',rejected:'Changes required'}[status] as CreatorProduct['status'] ?? 'Draft');
const moderationStatus = (status:string):ModerationItem['status'] => ({in_review:'In review',changes_requested:'Changes requested',published:'Approved',rejected:'Rejected',draft:'Queued'}[status] as ModerationItem['status'] ?? 'Queued');
const vendorStatus = (status:string):VendorApplication['status'] => ({pending:'Pending',approved:'Approved',more_information:'More information',suspended:'Suspended'}[status] as VendorApplication['status'] ?? 'Pending');
const caseStatus = (status:string):AdminCase['status'] => ({open:'Open',investigating:'Investigating',resolved:'Resolved',declined:'Declined'}[status] as AdminCase['status'] ?? 'Open');

function publicUrl(supabase:SupabaseClient<any>,bucket:string,path?:string|null,fallback='/images/marketplace-grid.webp'){
  if(!path)return fallback;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function loadPublicCatalogue(supabase:SupabaseClient<any>) {
  const [
    { data: productRows, error: productError },
    { data: categoryRows, error: categoryError },
    { data: vendorRows, error: vendorError },
    { data: followRows, error: followError },
    { data: settingsRow, error: settingsError }
  ] = await Promise.all([
    supabase.from('products').select(`*, category:categories(id,name,slug,accent), vendor:vendor_profiles(id,slug,display_name,handle,tagline,bio,response_time,location,specialties,avatar_path,banner_path,created_at,status), images:product_images(id,storage_path,alt_text,image_type,sort_order), versions:product_versions(id,version,file_size_bytes,is_current,status,approved_at,created_at), reviews:reviews(rating,title,body,created_at,status,buyer:profiles(display_name))`).eq('status','published').order('published_at',{ascending:false}),
    supabase.from('categories').select('*').eq('visible',true).order('sort_order'),
    supabase.from('vendor_profiles').select('*').eq('status','approved').order('display_name'),
    supabase.from('creator_follows').select('vendor_id'),
    supabase.from('marketplace_settings').select('*').eq('id',1).single()
  ]);
  if(productError)throw productError;
  if(categoryError)throw categoryError;
  if(vendorError)throw vendorError;
  if(followError)throw followError;
  if(settingsError)throw settingsError;

  const rows=(productRows??[]) as any[];
  const assets:Asset[]=rows.map(row=>{
    const imgs=[...(row.images??[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);
    const cover=imgs.find((i:any)=>i.image_type==='cover')??imgs[0];
    const gallery=imgs.map((i:any)=>publicUrl(supabase,'product-images',i.storage_path)).filter(Boolean);
    const version=(row.versions??[]).find((v:any)=>v.is_current&&v.status==='approved')??(row.versions??[]).find((v:any)=>v.status==='approved');
    return {
      id:row.id,currentVersionId:version?.id,slug:row.slug,title:row.title,category:row.category?.name??'Uncategorised',subcategory:row.subcategory??'',creator:row.vendor?.display_name??'Creator',creatorSlug:row.vendor?.slug??'',creatorAvatar:publicUrl(supabase,'avatars',row.vendor?.avatar_path,'/favicon.svg'),image:publicUrl(supabase,'product-images',cover?.storage_path),gallery:gallery.length?gallery:[publicUrl(supabase,'product-images',cover?.storage_path)],price:pounds(row.price_pence),extendedPrice:row.extended_price_pence==null?undefined:pounds(row.extended_price_pence),rating:Number(row.rating_average??0),reviews:Number(row.review_count??0),sales:Number(row.sales_count??0),badge:row.badge??(row.price_pence===0?'Free':undefined),accent:(row.category?.accent??'cyan') as Asset['accent'],compatibility:row.compatibility,maxVersion:row.max_version,sourceFiles:Boolean(row.source_files),dependencies:row.dependencies,downloadSize:bytes(version?.file_size_bytes??row.download_size_bytes),performance:row.performance,updated:dateLong(row.updated_at),version:version?.version??'1.0.0',summary:row.summary,description:row.description,features:row.features??[],contents:row.contents??[],tags:row.tags??[],formats:row.formats??[],licence:row.licence,recentReviews:[...(row.reviews??[])].filter((review:any)=>review.status==='published').sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,12).map((review:any)=>({buyer:review.buyer?.display_name??'Verified buyer',rating:Number(review.rating),title:review.title,text:review.body,date:dateShort(review.created_at)}))
    };
  });

  const assetCounts=new Map<string,number>();
  for(const asset of assets)assetCounts.set(asset.category,(assetCounts.get(asset.category)??0)+1);
  const categories:Category[]=((categoryRows??[]) as any[]).map(row=>({id:row.id,slug:row.slug,name:row.name,count:`${assetCounts.get(row.name)??0} ${(assetCounts.get(row.name)??0)===1?'asset':'assets'}`,icon:row.icon,description:row.description,accent:row.accent}));

  const byVendor=new Map<string,Asset[]>();
  const productRowsByVendor=new Map<string,any[]>();
  for(const asset of assets){const list=byVendor.get(asset.creatorSlug)??[];list.push(asset);byVendor.set(asset.creatorSlug,list);}
  for(const row of rows){const slug=row.vendor?.slug??'';const list=productRowsByVendor.get(slug)??[];list.push(row);productRowsByVendor.set(slug,list);}
  const followCounts=new Map<string,number>();
  for(const row of (followRows??[]) as any[])followCounts.set(row.vendor_id,(followCounts.get(row.vendor_id)??0)+1);

  const creators:Creator[]=((vendorRows??[]) as any[]).map(row=>{
    const products=byVendor.get(row.slug)??[];
    const reviewCount=products.reduce((sum,product)=>sum+product.reviews,0);
    const recentReviews=(productRowsByVendor.get(row.slug)??[])
      .flatMap(product=>(product.reviews??[]).filter((review:any)=>review.status==='published').map((review:any)=>({rating:Number(review.rating),title:review.title,text:review.body,date:dateShort(review.created_at),createdAt:review.created_at})))
      .sort((a:any,b:any)=>String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0,6)
      .map(({createdAt,...review}:any)=>review);
    return {
      id:row.id,slug:row.slug,name:row.display_name,avatar:publicUrl(supabase,'avatars',row.avatar_path,'/favicon.svg'),banner:publicUrl(supabase,'storefront-banners',row.banner_path,'/images/hero-city.webp'),tagline:row.tagline,bio:row.bio,rating:reviewCount?Number((products.reduce((sum,product)=>sum+product.rating*product.reviews,0)/reviewCount).toFixed(1)):0,reviews:reviewCount,sales:products.reduce((sum,product)=>sum+product.sales,0),followers:followCounts.get(row.id)??0,joined:dateLong(row.created_at),responseTime:row.response_time,location:row.location,specialties:row.specialties??[],verified:row.status==='approved',recentReviews,supportPromise:row.support_promise??'',updateCommitment:row.update_commitment??'',licenceNotes:row.custom_licence_notes??''
    };
  });

  const settings=settingsRow as any;
  return {assets,categories,creators,settings:{marketplaceName:settings?.marketplace_name??'AssetGuru',supportEmail:settings?.support_email??'',defaultCommission:Number(settings?.default_commission_percent??15),minimumPrice:pounds(settings?.minimum_price_pence??299),payoutDelay:Number(settings?.payout_delay_days??14),autoApproveUpdates:Boolean(settings?.auto_approve_updates),requireHumanReview:settings?.require_human_review!==false,allowFreeAssets:settings?.allow_free_assets!==false,allowAiAssisted:settings?.allow_ai_assisted!==false,maintenanceMode:Boolean(settings?.maintenance_mode),matureContent:settings?.mature_content??'Tagged and moderated',buyerReviewDelay:Number(settings?.buyer_review_delay_days??3),refundWindow:Number(settings?.refund_window_days??14),featuredLabel:settings?.featured_label??'Guru Pick'}};
}

export async function loadBuyer(supabase:SupabaseClient<any>, userId:string) {
  const [{data:profile},{data:orders},{data:reviews},{data:tickets},{data:downloads},{data:favourites},{data:notifications}] = await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).single(),
    supabase.from('orders').select(`*, items:order_items(id,licence_type,unit_amount_pence,status,refund_amount_pence, product:products(slug), version:product_versions(id,version))`).eq('user_id',userId).order('created_at',{ascending:false}),
    supabase.from('reviews').select(`*, product:products(slug)`).eq('user_id',userId).order('created_at',{ascending:false}),
    supabase.from('support_tickets').select(`*, product:products(slug), order:orders(order_number)`).eq('user_id',userId).order('updated_at',{ascending:false}),
    supabase.from('download_events').select(`*, version:product_versions(version, product:products(slug))`).eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
    supabase.from('favourites').select(`product:products(slug)`).eq('user_id',userId),
    supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(100)
  ]);
  const p=profile as any;
  const buyerProfile:BuyerProfile={name:p?.display_name??'',email:p?.email??'',initials:initials(p?.display_name),country:p?.country??'United Kingdom',studio:p?.studio??'',joined:dateLong(p?.created_at),avatarTone:p?.avatar_tone??'cyan',marketing:Boolean(p?.marketing_opt_in),updateEmails:p?.update_emails!==false};
  const buyerOrders:BuyerOrder[]=((orders??[]) as any[]).map(order=>({id:order.order_number,databaseId:order.id,date:dateLong(order.created_at),timestamp:new Date(order.created_at).getTime(),status:order.status==='refunded'?'Refunded':order.status==='partially_refunded'?'Partially refunded':order.status==='paid'?'Complete':order.status==='failed'?'Failed':'Pending',payment:order.payment_method_summary??'Stripe',subtotal:pounds(order.subtotal_pence),vat:pounds(order.tax_pence),total:pounds(order.total_pence),items:(order.items??[]).map((item:any)=>({id:item.id,versionId:item.version?.id,slug:item.product?.slug??'',licence:item.licence_type,price:pounds(item.unit_amount_pence),version:item.version?.version??'1.0.0',refunded:item.status==='refunded',refundStatus:item.status==='refund_requested'?'Requested':item.status==='refunded'?'Approved':item.status==='refund_declined'?'Declined':undefined}))}));
  const buyerReviews:BuyerReview[]=((reviews??[]) as any[]).map(row=>({id:row.id,slug:row.product?.slug??'',rating:row.rating,title:row.title,text:row.body,submitted:dateLong(row.created_at)}));
  const buyerTickets:SupportTicket[]=((tickets??[]) as any[]).map(row=>({databaseId:row.id,id:row.ticket_number,subject:row.subject,category:({asset_support:'Asset support',order_billing:'Order & billing',refund_request:'Refund request',account:'Account'} as any)[row.category]??'Account',status:({open:'Open',waiting_on_creator:'Waiting on creator',resolved:'Resolved'} as any)[row.status]??'Open',updated:dateLong(row.updated_at),productSlug:row.product?.slug,orderId:row.order?.order_number,message:row.message}));
  const buyerDownloads:DownloadEvent[]=((downloads??[]) as any[]).map(row=>({slug:row.version?.product?.slug??'',version:row.version?.version??'',downloadedAt:dateTimeShort(row.created_at)}));
  return {profile:buyerProfile,orders:buyerOrders,reviews:buyerReviews,tickets:buyerTickets,downloads:buyerDownloads,favourites:((favourites??[]) as any[]).map(row=>row.product?.slug).filter(Boolean),notifications:notifications??[]};
}

export async function loadVendor(supabase:SupabaseClient<any>, userId:string) {
  const {data:vendor,error}=await supabase.from('vendor_profiles').select('*').eq('user_id',userId).single();if(error)throw error;const v=vendor as any;
  const [{data:products},{data:orderItems},{data:payouts},{data:settings},{count:followers}] = await Promise.all([
    supabase.from('products').select(`*, category:categories(name), images:product_images(storage_path,image_type,sort_order), versions:product_versions(id,version,is_current,status,file_size_bytes,release_notes,created_at), reviews:reviews(id,rating,title,body,created_at,status, buyer:profiles(display_name))`).eq('vendor_id',v.id).order('updated_at',{ascending:false}),
    supabase.from('order_items').select(`*, product:products(title), order:orders(order_number,created_at,status,user_id, buyer:profiles(display_name))`).eq('vendor_id',v.id).order('created_at',{ascending:false}),
    supabase.from('payouts').select('*').eq('vendor_id',v.id).order('created_at',{ascending:false}),
    supabase.from('marketplace_settings').select('default_commission_percent').eq('id',1).maybeSingle(),
    supabase.from('creator_follows').select('*',{count:'exact',head:true}).eq('vendor_id',v.id)
  ]);
  const creatorProducts:CreatorProduct[]=((products??[]) as any[]).map(row=>{const sortedImages=[...(row.images??[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);const image=sortedImages[0];const sortedVersions=[...(row.versions??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));const version=sortedVersions.find((x:any)=>x.is_current)??sortedVersions[0];const paid=((orderItems??[]) as any[]).filter(i=>i.product_id===row.id&&['paid','refund_requested','refund_declined'].includes(i.status));const revenue=paid.reduce((s,i)=>s+pounds(i.vendor_net_pence),0);return{id:row.id,currentVersionId:version?.id,slug:row.slug,title:row.title,image:publicUrl(supabase,'product-images',image?.storage_path),category:row.category?.name??'Uncategorised',status:productStatus(row.status),price:pounds(row.price_pence),sales:paid.length,revenue,views:row.view_count??0,conversion:row.view_count?Number((paid.length/row.view_count*100).toFixed(2)):0,rating:Number(row.rating_average??0),reviews:Number(row.review_count??0),version:version?.version??'1.0.0',updated:dateShort(row.updated_at),moderationNote:row.moderation_notes||undefined,summary:row.summary??'',description:row.description??'',extendedPrice:row.extended_price_pence==null?undefined:pounds(row.extended_price_pence),compatibility:row.compatibility??'GameGuru MAX',maxVersion:row.max_version??'Any MAX build',sourceFiles:Boolean(row.source_files),dependencies:row.dependencies??'None',performance:row.performance??'Mid-range',features:row.features??[],contents:row.contents??[],tags:row.tags??[],formats:row.formats??[],licence:row.licence??'Standard commercial licence',images:sortedImages.map((entry:any)=>publicUrl(supabase,'product-images',entry.storage_path)),versions:sortedVersions.map((entry:any)=>({id:entry.id,version:entry.version,status:entry.status,isCurrent:Boolean(entry.is_current),size:bytes(entry.file_size_bytes),created:dateShort(entry.created_at),releaseNotes:entry.release_notes??''}))};});
  const creatorOrders:CreatorOrder[]=((orderItems??[]) as any[]).map(row=>({id:row.order?.order_number??row.id,buyer:row.order?.buyer?.display_name??'Buyer',initials:initials(row.order?.buyer?.display_name),product:row.product?.title??'Asset',licence:row.licence_type==='extended'?'Extended':'Standard',date:dateTimeShort(row.created_at),createdAt:row.created_at,total:pounds(row.unit_amount_pence),fee:pounds(row.commission_pence),net:pounds(row.vendor_net_pence),status:row.status==='refund_requested'?'Refund requested':row.status==='refunded'?'Refunded':row.order?.status==='paid'?'Paid':'Pending'}));
  const approvedProducts=creatorProducts.filter(p=>p.status==='Published');const reviewRows=((products??[]) as any[]).flatMap(p=>(p.reviews??[]).filter((r:any)=>r.status==='published').map((r:any)=>({...r,product:p.title})));
  const profile={name:v.display_name,slug:v.slug,handle:v.handle,avatar:publicUrl(supabase,'avatars',v.avatar_path,'/favicon.svg'),banner:publicUrl(supabase,'storefront-banners',v.banner_path,'/images/hero-city.webp'),tagline:v.tagline,rating:reviewRows.length?Number((reviewRows.reduce((s:any,r:any)=>s+r.rating,0)/reviewRows.length).toFixed(1)):0,reviews:reviewRows.length,followers:followers??0,responseTime:v.response_time,hasAvatar:Boolean(v.avatar_path),hasBanner:Boolean(v.banner_path),completion:[v.tagline,v.bio,v.support_email,v.response_time,v.avatar_path,v.banner_path].filter(Boolean).length/6*100,commission:Number(v.commission_percent??(settings as any)?.default_commission_percent??15),payoutSchedule:v.payout_schedule,connectedAccount:v.stripe_payouts_enabled?'Stripe ready':v.stripe_account_id?'Stripe onboarding incomplete':'Not connected',tier:v.status==='approved'?'PRO':'PENDING',status:v.status};
  const storefront={displayName:v.display_name,tagline:v.tagline,bio:v.bio,supportEmail:v.support_email,responseTime:v.response_time,featuredSlug:creatorProducts.find(p=>p.id===v.featured_product_id)?.slug??creatorProducts[0]?.slug??'',accent:v.storefront_accent,showSales:v.show_sales,showFollowers:v.show_followers,vacationMode:v.vacation_mode,sections:v.storefront_sections??{hero:true,featured:true,bestsellers:true,latest:true,about:true},supportPromise:v.support_promise??'',updateCommitment:v.update_commitment??'',licenceNotes:v.custom_licence_notes??''};
  const dayKeys=Array.from({length:20},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-(19-i));return d.toISOString().slice(0,10)});const revenueMap=new Map<string,number>();const salesMap=new Map<string,number>();for(const item of (orderItems??[]) as any[]){const key=String(item.created_at).slice(0,10);revenueMap.set(key,(revenueMap.get(key)??0)+pounds(item.vendor_net_pence));salesMap.set(key,(salesMap.get(key)??0)+1);}
  return {profile,storefront,products:creatorProducts,orders:creatorOrders,revenueSeries:dayKeys.map(k=>revenueMap.get(k)??0),salesSeries:dayKeys.map(k=>salesMap.get(k)??0),trafficSources:[{label:'AssetGuru search',value:0,tone:'cyan'},{label:'Category browsing',value:0,tone:'violet'},{label:'External links',value:0,tone:'magenta'},{label:'Creator followers',value:0,tone:'blue'},{label:'Collections',value:0,tone:'green'}],payouts:((payouts??[]) as any[]).map(row=>({id:row.stripe_transfer_id??row.id,date:dateShort(row.created_at),gross:pounds(row.gross_pence),refunds:pounds(row.refunded_pence),fees:pounds(row.commission_pence),net:pounds(row.net_pence-row.refunded_pence),status:row.status==='paid'?'Paid':row.status==='failed'?'Failed':'Pending'})),reviews:reviewRows.slice(0,20).map((r:any)=>({buyer:r.buyer?.display_name??'Verified buyer',product:r.product,rating:r.rating,quote:r.body,date:dateShort(r.created_at)})),published:approvedProducts.length};
}

export async function loadAdmin(supabase:SupabaseClient<any>) {
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [productResult,vendorResult,caseResult,categoryResult,allProductResult,settingsResult,auditResult,orderResult,reportResult,reviewResult,downloadResult] = await Promise.all([
    supabase.from('products').select(`*, vendor:vendor_profiles(display_name), category:categories(name), versions:product_versions(version,file_size_bytes,created_at,status)`).eq('status','in_review').order('updated_at',{ascending:false}),
    // Fetch vendors without a nested profile relationship. This avoids one broken
    // relationship query silently turning the whole vendor list into an empty array.
    supabase.from('vendor_profiles').select('*').order('created_at',{ascending:false}),
    supabase.from('admin_cases').select(`*, product:products(title), vendor:vendor_profiles(display_name), buyer:profiles!admin_cases_buyer_id_fkey(display_name), order:orders(order_number,status)`).order('created_at',{ascending:false}),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('products').select('id,vendor_id,category_id,status'),
    supabase.from('marketplace_settings').select('*').eq('id',1).single(),
    supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(200),
    supabase.from('orders').select('created_at,total_pence,status').gte('created_at',since),
    supabase.from('order_items').select(`created_at,unit_amount_pence,commission_pence,refund_amount_pence,status,product:products(category:categories(name))`).gte('created_at',since),
    supabase.from('reviews').select('rating').eq('status','published'),
    supabase.from('download_events').select('entitlement:entitlements(order_item_id)')
  ]);

  const firstError=[productResult.error,vendorResult.error,caseResult.error,categoryResult.error,allProductResult.error,settingsResult.error,auditResult.error,orderResult.error,reportResult.error,reviewResult.error,downloadResult.error].find(Boolean);
  if(firstError)throw firstError;

  const products=productResult.data;
  const vendors=vendorResult.data;
  const cases=caseResult.data;
  const categories=categoryResult.data;
  const allProducts=allProductResult.data;
  const settings=settingsResult.data;
  const audit=auditResult.data;
  const orders=orderResult.data;
  const reportItems=reportResult.data;
  const publishedReviews=reviewResult.data;
  const downloadEvents=downloadResult.data;

  const vendorRows=(vendors??[]) as any[];
  const ownerIds=[...new Set(vendorRows.map(row=>row.user_id).filter(Boolean))];
  let ownerRows:any[]=[];
  if(ownerIds.length){
    const {data,error}=await supabase.from('profiles').select('id,display_name,email,country').in('id',ownerIds);
    if(error)throw error;
    ownerRows=(data??[]) as any[];
  }
  const ownersById=new Map(ownerRows.map(row=>[row.id,row]));
  const moderation:ModerationItem[]=((products??[]) as any[]).map(row=>{const pending=[...(row.versions??[])].filter((entry:any)=>entry.status==='pending').sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))[0];return{id:row.id,databaseId:row.id,title:row.title,vendor:row.vendor?.display_name??'Creator',category:row.category?.name??'Uncategorised',submitted:dateTimeShort(row.updated_at),version:pending?.version??'—',type:row.published_at?'Version update':'Product submission',risk:row.price_pence===0?'Low':'Medium',status:moderationStatus(row.status),files:bytes(pending?.file_size_bytes),notes:row.moderation_notes||undefined};});
  const vendorApplications:VendorApplication[]=vendorRows.map(row=>{const owner=ownersById.get(row.user_id);return{id:row.id,databaseId:row.id,name:row.display_name,owner:owner?.display_name??row.display_name,handle:row.handle,email:owner?.email??row.support_email,country:owner?.country??row.location,submitted:dateLong(row.created_at),appliedAt:row.created_at,approvedAt:row.approved_at??undefined,portfolio:row.bio||'No portfolio statement supplied.',products:`${((allProducts??[]) as any[]).filter(p=>p.vendor_id===row.id).length} submitted`,status:vendorStatus(row.status),stripe:row.stripe_payouts_enabled?'Ready':row.stripe_account_id?'Incomplete':'Not connected',commission:Number(row.commission_percent??(settings as any)?.default_commission_percent??15),risk:row.status==='suspended'?'High':'Low',reason:row.status_reason||undefined};});
  const downloadCounts=new Map<string,number>();for(const event of (downloadEvents??[]) as any[]){const orderItemId=event.entitlement?.order_item_id;if(orderItemId)downloadCounts.set(orderItemId,(downloadCounts.get(orderItemId)??0)+1);}const adminCases:AdminCase[]=((cases??[]) as any[]).map(row=>({id:row.case_number,databaseId:row.id,type:row.case_type.replaceAll('_',' '),product:row.product?.title??'—',vendor:row.vendor?.display_name??'—',buyer:row.buyer?.display_name??'—',amount:pounds(row.amount_pence),opened:dateTimeShort(row.created_at),priority:row.priority==='urgent'?'Urgent':row.priority==='high'?'High':'Normal',status:caseStatus(row.status),summary:row.summary,orderId:row.order?.order_number,paymentState:row.order?.status?String(row.order.status).replaceAll('_',' '):undefined,downloadCount:row.order_item_id?downloadCounts.get(row.order_item_id)??0:0}));
  const productRows=(allProducts??[]) as any[];const cat:CatalogueCategory[]=((categories??[]) as any[]).map(row=>{const list=productRows.filter(p=>p.category_id===row.id);return{id:row.id,name:row.name,slug:row.slug,products:list.length,published:list.filter(p=>p.status==='published').length,pending:list.filter(p=>['draft','in_review','changes_requested'].includes(p.status)).length,featured:row.featured,visible:row.visible,commissionOverride:row.commission_override==null?undefined:Number(row.commission_override)};});
  const s=settings as any;const platform:PlatformSettings=s?{marketplaceName:s.marketplace_name,supportEmail:s.support_email,defaultCommission:Number(s.default_commission_percent),minimumPrice:pounds(s.minimum_price_pence),payoutDelay:s.payout_delay_days,autoApproveUpdates:s.auto_approve_updates,requireHumanReview:s.require_human_review,allowFreeAssets:s.allow_free_assets,allowAiAssisted:s.allow_ai_assisted,maintenanceMode:s.maintenance_mode,matureContent:s.mature_content,buyerReviewDelay:s.buyer_review_delay_days,refundWindow:s.refund_window_days,featuredLabel:s.featured_label}:defaultPlatformSettings;
  const auditEvents:AuditEvent[]=((audit??[]) as any[]).map(row=>({id:String(row.id).slice(0,8).toUpperCase(),actor:row.actor_id?'Administrator':'System',role:row.actor_role,action:row.action,target:`${row.entity_type}${row.entity_id?` · ${row.entity_id}`:''}`,time:dateTimeShort(row.created_at),tone:row.action.includes('refund')||row.action.includes('reject')?'warn':row.action.includes('approve')||row.action.includes('paid')?'good':'neutral'}));
  const days=Array.from({length:30},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-(29-i));return d.toISOString().slice(0,10)});const revenue=new Map<string,number>();const count=new Map<string,number>();const completedOrders=((orders??[]) as any[]).filter(order=>['paid','partially_refunded','refunded'].includes(order.status));for(const order of completedOrders){const key=String(order.created_at).slice(0,10);revenue.set(key,(revenue.get(key)??0)+pounds(order.total_pence));count.set(key,(count.get(key)??0)+1);}
  const itemRows=(reportItems??[]) as any[];const commercialItems=itemRows.filter(item=>['paid','refund_requested','refund_declined'].includes(item.status));const refundedItems=itemRows.filter(item=>item.status==='refunded'||Number(item.refund_amount_pence)>0);const gmv=commercialItems.reduce((sum,item)=>sum+pounds(item.unit_amount_pence),0);const marketplaceRevenue=commercialItems.reduce((sum,item)=>sum+pounds(item.commission_pence),0);const categoryMap=new Map<string,{gmv:number;orders:number}>();for(const item of commercialItems){const name=item.product?.category?.name??'Uncategorised';const current=categoryMap.get(name)??{gmv:0,orders:0};current.gmv+=pounds(item.unit_amount_pence);current.orders+=1;categoryMap.set(name,current);}const reportCategories:AdminCategoryReport[]=[...categoryMap.entries()].map(([name,value])=>({name,gmv:Number(value.gmv.toFixed(2)),orders:value.orders,share:gmv?Number((value.gmv/gmv*100).toFixed(1)):0})).sort((a,b)=>b.gmv-a.gmv);const ratingRows=(publishedReviews??[]) as any[];const metrics:AdminMetrics={gmv:Number(gmv.toFixed(2)),orders:completedOrders.length,marketplaceRevenue:Number(marketplaceRevenue.toFixed(2)),averageOrder:completedOrders.length?Number((completedOrders.reduce((sum,order)=>sum+pounds(order.total_pence),0)/completedOrders.length).toFixed(2)):0,refundRate:itemRows.length?Number((refundedItems.length/itemRows.length*100).toFixed(2)):0,averageRating:ratingRows.length?Number((ratingRows.reduce((sum,row)=>sum+Number(row.rating),0)/ratingRows.length).toFixed(2)):0,activeVendors:((vendors??[]) as any[]).filter(v=>v.status==='approved').length,publishedProducts:productRows.filter(p=>p.status==='published').length,paidItems:commercialItems.length};
  return {moderation,vendors:vendorApplications,cases:adminCases,categories:cat,settings:platform,audit:auditEvents,revenueSeries:days.map(k=>revenue.get(k)??0),orderSeries:days.map(k=>count.get(k)??0),metrics,reportCategories};
}
