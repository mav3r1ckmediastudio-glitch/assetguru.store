import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatorOrder, CreatorProduct, ProductStatus } from '$lib/data/creator';

const pounds=(pence?:number|null)=>Number(((pence??0)/100).toFixed(2));
const dateShort=(value?:string|null)=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'';
const dateTimeShort=(value?:string|null)=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'';
const initials=(name='')=>name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'AG';
const bytes=(size?:number|null)=>{const value=Number(size??0);if(!value)return'0 MB';const units=['B','KB','MB','GB','TB'];const index=Math.min(Math.floor(Math.log(value)/Math.log(1024)),units.length-1);return`${(value/1024**index).toFixed(index>2?1:0)} ${units[index]}`;};
const productStatus=(status:string):ProductStatus=>({published:'Published',draft:'Draft',in_review:'In review',changes_requested:'Changes required',retired:'Retired',rejected:'Changes required'}[status] as ProductStatus)??'Draft';

function publicUrl(supabase:SupabaseClient<any>,bucket:string,path?:string|null,fallback='/images/marketplace-grid.webp'){
  if(!path)return fallback;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function imageUrl(supabase:SupabaseClient<any>,path?:string|null,width=320,height=180){
  if(!path)return'/images/marketplace-grid.webp';
  return supabase.storage.from('product-images').getPublicUrl(path,{transform:{width,height,resize:'cover',quality:82}}).data.publicUrl;
}

async function vendorForUser(supabase:SupabaseClient<any>,userId:string){
  const {data,error}=await supabase.from('vendor_profiles').select('*').eq('user_id',userId).single();
  if(error)throw error;
  if(!data)throw Object.assign(new Error('Vendor profile not found.'),{status:404});
  return data as any;
}

async function coverMap(supabase:SupabaseClient<any>,productIds:string[]){
  const covers=new Map<string,any>();
  if(!productIds.length)return covers;
  const {data,error}=await supabase.from('product_images').select('product_id,storage_path,sort_order,image_type').in('product_id',productIds).order('sort_order',{ascending:true});
  if(error)throw error;
  for(const row of (data??[]) as any[]){
    const current=covers.get(row.product_id);
    if(!current||row.image_type==='cover')covers.set(row.product_id,row);
  }
  return covers;
}

async function versionMap(supabase:SupabaseClient<any>,productIds:string[]){
  const versions=new Map<string,any>();
  if(!productIds.length)return versions;
  const {data,error}=await supabase.from('product_versions').select('id,product_id,version,is_current,status,file_size_bytes,release_notes,created_at').in('product_id',productIds).order('created_at',{ascending:false});
  if(error)throw error;
  for(const row of (data??[]) as any[]){
    const current=versions.get(row.product_id);
    if(!current||(!current.is_current&&row.is_current))versions.set(row.product_id,row);
  }
  return versions;
}

function blankProduct(row:any,image:string,version:any,revenue=0,sales?:number):CreatorProduct{
  const paidSales=sales??Number(row.sales_count??0);
  const views=Number(row.view_count??0);
  return{
    id:row.id,currentVersionId:version?.id,slug:row.slug,title:row.title,image,
    category:row.category?.name??'Uncategorised',subcategory:row.subcategory??'',status:productStatus(row.status),
    price:pounds(row.price_pence),sales:paidSales,revenue,views,conversion:views?Number((paidSales/views*100).toFixed(2)):0,
    rating:Number(row.rating_average??0),reviews:Number(row.review_count??0),version:version?.version??'1.0.0',updated:dateShort(row.updated_at),
    moderationNote:row.moderation_notes||undefined,summary:row.summary??'',description:'',extendedPrice:row.extended_price_pence==null?undefined:pounds(row.extended_price_pence),
    compatibility:row.compatibility??'GameGuru MAX',maxVersion:row.max_version??'Any MAX build',sourceFiles:Boolean(row.source_files),dependencies:row.dependencies??'None',
    performance:row.performance??'Mid-range',features:[],contents:[],tags:[],formats:[],licence:'',images:[],versions:[]
  };
}

export async function loadVendorShell(supabase:SupabaseClient<any>,userId:string){
  const vendor=await vendorForUser(supabase,userId);
  const [{data:products,error:productsError},{data:settings,error:settingsError},{count:followers,error:followersError}]=await Promise.all([
    supabase.from('products').select('id,slug,status,sales_count,view_count,rating_average,review_count').eq('vendor_id',vendor.id),
    supabase.from('marketplace_settings').select('default_commission_percent').eq('id',1).maybeSingle(),
    supabase.from('creator_follows').select('*',{count:'exact',head:true}).eq('vendor_id',vendor.id)
  ]);
  if(productsError)throw productsError;if(settingsError)throw settingsError;if(followersError)throw followersError;
  const rows=(products??[]) as any[];
  const reviewCount=rows.reduce((sum,row)=>sum+Number(row.review_count??0),0);
  const rating=reviewCount?Number((rows.reduce((sum,row)=>sum+Number(row.rating_average??0)*Number(row.review_count??0),0)/reviewCount).toFixed(1)):0;
  const counts={
    all:rows.length,published:rows.filter((row)=>row.status==='published').length,inReview:rows.filter((row)=>row.status==='in_review').length,
    changesRequired:rows.filter((row)=>['changes_requested','rejected'].includes(row.status)).length,drafts:rows.filter((row)=>row.status==='draft').length,retired:rows.filter((row)=>row.status==='retired').length
  };
  const totals={revenue:0,sales:rows.reduce((sum,row)=>sum+Number(row.sales_count??0),0),views:rows.reduce((sum,row)=>sum+Number(row.view_count??0),0),published:counts.published,pending:counts.inReview+counts.changesRequired};
  const profile={name:vendor.display_name,slug:vendor.slug,handle:vendor.handle,avatar:publicUrl(supabase,'avatars',vendor.avatar_path,'/favicon.svg'),banner:publicUrl(supabase,'storefront-banners',vendor.banner_path,'/images/hero-city.webp'),hasAvatar:Boolean(vendor.avatar_path),hasBanner:Boolean(vendor.banner_path),tagline:vendor.tagline,rating,reviews:reviewCount,followers:followers??0,responseTime:vendor.response_time,completion:[vendor.tagline,vendor.bio,vendor.support_email,vendor.response_time,vendor.avatar_path,vendor.banner_path].filter(Boolean).length/6*100,commission:Number(vendor.commission_percent??(settings as any)?.default_commission_percent??15),payoutSchedule:vendor.payout_schedule,connectedAccount:vendor.stripe_payouts_enabled?'Stripe ready':vendor.stripe_account_id?'Stripe onboarding incomplete':'Not connected',tier:vendor.status==='approved'?'PRO':'PENDING',status:vendor.status};
  const storefront={displayName:vendor.display_name,tagline:vendor.tagline,bio:vendor.bio,supportEmail:vendor.support_email,responseTime:vendor.response_time,featuredSlug:rows.find((row)=>row.id===vendor.featured_product_id)?.slug??rows[0]?.slug??'',accent:vendor.storefront_accent,showSales:vendor.show_sales,showFollowers:vendor.show_followers,vacationMode:vendor.vacation_mode,sections:vendor.storefront_sections??{hero:true,featured:true,bestsellers:true,latest:true,about:true},supportPromise:vendor.support_promise??'',updateCommitment:vendor.update_commitment??'',licenceNotes:vendor.custom_licence_notes??''};
  return{profile,storefront,counts,totals};
}

export type VendorProductQuery={page?:number;pageSize?:number;search?:string;status?:string;sort?:string};
export async function loadVendorProducts(supabase:SupabaseClient<any>,userId:string,options:VendorProductQuery={}){
  const vendor=await vendorForUser(supabase,userId);
  const requestedPage=Number(options.page??1),requestedPageSize=Number(options.pageSize??24);
  const page=Number.isFinite(requestedPage)?Math.max(1,Math.floor(requestedPage)):1;const pageSize=Number.isFinite(requestedPageSize)?Math.min(48,Math.max(1,Math.floor(requestedPageSize))):24;
  const from=(page-1)*pageSize;const to=from+pageSize-1;
  const statuses=(options.status??'').split(',').map((value)=>value.trim()).filter(Boolean).flatMap((value)=>value==='Changes required'?['changes_requested','rejected']:[({Published:'published',Draft:'draft','In review':'in_review',Retired:'retired'} as Record<string,string>)[value]??value]);
  const search=(options.search??'').trim().replace(/[^a-z0-9\s'-]/gi,' ').replace(/\s+/g,' ').slice(0,80);
  const sort=options.sort??'Recently updated';
  let query=supabase.from('products').select('id,slug,title,subcategory,status,price_pence,extended_price_pence,sales_count,view_count,rating_average,review_count,updated_at,moderation_notes,summary,compatibility,max_version,source_files,dependencies,performance,category:categories(name)',{count:'exact'}).eq('vendor_id',vendor.id);
  if(search){const pattern=`%${search}%`;query=query.or(`title.ilike.${pattern},subcategory.ilike.${pattern},summary.ilike.${pattern}`);}
  if(statuses.length===1)query=query.eq('status',statuses[0]);else if(statuses.length>1)query=query.in('status',statuses);
  if(sort==='Title')query=query.order('title',{ascending:true});else if(sort==='Sales')query=query.order('sales_count',{ascending:false});else query=query.order('updated_at',{ascending:false});

  const [{data:statusRows,error:statusError},result]=await Promise.all([
    supabase.from('products').select('status').eq('vendor_id',vendor.id),
    sort==='Revenue'?query:query.range(from,to)
  ]);
  if(statusError)throw statusError;if(result.error)throw result.error;

  let allRows=(result.data??[]) as any[];
  let total=result.count??allRows.length;
  let revenue=new Map<string,number>();let paidCount=new Map<string,number>();
  if(sort==='Revenue'&&allRows.length){
    const {data:allOrders,error:allOrdersError}=await supabase.from('order_items').select('product_id,vendor_net_pence,status').in('product_id',allRows.map((row)=>row.id)).in('status',['paid','refund_requested','refund_declined']);
    if(allOrdersError)throw allOrdersError;
    for(const item of (allOrders??[]) as any[]){revenue.set(item.product_id,(revenue.get(item.product_id)??0)+pounds(item.vendor_net_pence));paidCount.set(item.product_id,(paidCount.get(item.product_id)??0)+1);}
    allRows=allRows.sort((a,b)=>(revenue.get(b.id)??0)-(revenue.get(a.id)??0)||String(b.updated_at).localeCompare(String(a.updated_at)));
  }
  const list=sort==='Revenue'?allRows.slice(from,to+1):allRows;
  const ids=list.map((row)=>row.id);
  const [covers,versions,orderResult]=await Promise.all([
    coverMap(supabase,ids),versionMap(supabase,ids),
    sort==='Revenue'||!ids.length?Promise.resolve({data:[],error:null}):supabase.from('order_items').select('product_id,vendor_net_pence,status').in('product_id',ids).in('status',['paid','refund_requested','refund_declined'])
  ]);
  if(orderResult.error)throw orderResult.error;
  for(const item of (orderResult.data??[]) as any[]){revenue.set(item.product_id,(revenue.get(item.product_id)??0)+pounds(item.vendor_net_pence));paidCount.set(item.product_id,(paidCount.get(item.product_id)??0)+1);}
  const products=list.map((row)=>blankProduct(row,imageUrl(supabase,covers.get(row.id)?.storage_path),versions.get(row.id),revenue.get(row.id)??0,paidCount.get(row.id)??Number(row.sales_count??0)));
  const statusesAll=(statusRows??[]) as any[];
  const counts={all:statusesAll.length,published:statusesAll.filter((row)=>row.status==='published').length,inReview:statusesAll.filter((row)=>row.status==='in_review').length,changesRequired:statusesAll.filter((row)=>['changes_requested','rejected'].includes(row.status)).length,drafts:statusesAll.filter((row)=>row.status==='draft').length,retired:statusesAll.filter((row)=>row.status==='retired').length};
  return{products,counts,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize),hasMore:to+1<total}};
}

export async function loadVendorProduct(supabase:SupabaseClient<any>,userId:string,slug:string){
  const vendor=await vendorForUser(supabase,userId);
  const {data:row,error}=await supabase.from('products').select('*,category:categories(name),images:product_images(storage_path,image_type,sort_order),versions:product_versions(id,version,is_current,status,file_size_bytes,release_notes,created_at)').eq('vendor_id',vendor.id).eq('slug',slug).single();
  if(error)throw error;if(!row)throw Object.assign(new Error('Product not found.'),{status:404});
  const sortedImages=[...((row as any).images??[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);const sortedVersions=[...((row as any).versions??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));const version=sortedVersions.find((entry:any)=>entry.is_current)??sortedVersions[0];
  const {data:orders,error:ordersError}=await supabase.from('order_items').select('vendor_net_pence,status').eq('product_id',(row as any).id).in('status',['paid','refund_requested','refund_declined']);if(ordersError)throw ordersError;
  const paid=(orders??[]) as any[];const revenue=paid.reduce((sum,item)=>sum+pounds(item.vendor_net_pence),0);const product=blankProduct(row,imageUrl(supabase,sortedImages[0]?.storage_path,960,540),version,revenue,paid.length||Number((row as any).sales_count??0));
  product.description=(row as any).description??'';product.features=(row as any).features??[];product.contents=(row as any).contents??[];product.tags=(row as any).tags??[];product.formats=(row as any).formats??[];product.licence=(row as any).licence??'Standard commercial licence';product.showcaseVideoUrl=(row as any).showcase_video_url||undefined;product.images=sortedImages.map((entry:any)=>publicUrl(supabase,'product-images',entry.storage_path));product.versions=sortedVersions.map((entry:any)=>({id:entry.id,version:entry.version,status:entry.status,isCurrent:Boolean(entry.is_current),size:bytes(entry.file_size_bytes),created:dateShort(entry.created_at),releaseNotes:entry.release_notes??''}));
  return{product};
}

export async function loadVendorOrders(supabase:SupabaseClient<any>,userId:string,page=1,pageSize=25){
  const vendor=await vendorForUser(supabase,userId);page=Number.isFinite(page)?Math.max(1,Math.floor(page)):1;pageSize=Number.isFinite(pageSize)?Math.min(100,Math.max(1,Math.floor(pageSize))):25;const from=(page-1)*pageSize;const to=from+pageSize-1;
  const {data,error,count}=await supabase.from('order_items').select('id,licence_type,unit_amount_pence,commission_pence,vendor_net_pence,status,created_at,product:products(title),order:orders(order_number,created_at,status,user_id,buyer:profiles(display_name))',{count:'exact'}).eq('vendor_id',vendor.id).order('created_at',{ascending:false}).range(from,to);
  if(error)throw error;const orders:CreatorOrder[]=((data??[]) as any[]).map((row)=>({id:row.order?.order_number??row.id,buyer:row.order?.buyer?.display_name??'Buyer',initials:initials(row.order?.buyer?.display_name),product:row.product?.title??'Asset',licence:row.licence_type==='extended'?'Extended':'Standard',date:dateTimeShort(row.created_at),createdAt:row.created_at,total:pounds(row.unit_amount_pence),fee:pounds(row.commission_pence),net:pounds(row.vendor_net_pence),status:row.status==='refund_requested'?'Refund requested':row.status==='refunded'?'Refunded':row.order?.status==='paid'?'Paid':'Pending'}));
  const total=count??0;return{orders,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize),hasMore:to+1<total}};
}

export async function loadVendorAnalytics(supabase:SupabaseClient<any>,userId:string){
  const vendor=await vendorForUser(supabase,userId);
  const [{data:rows,error:productsError},{data:orders,error:ordersError}]=await Promise.all([
    supabase.from('products').select('id,slug,title,subcategory,status,price_pence,sales_count,view_count,rating_average,review_count,updated_at,category:categories(name)').eq('vendor_id',vendor.id).order('view_count',{ascending:false}),
    supabase.from('order_items').select('product_id,vendor_net_pence,status,created_at').eq('vendor_id',vendor.id).in('status',['paid','refund_requested','refund_declined'])
  ]);if(productsError)throw productsError;if(ordersError)throw ordersError;
  const allProducts=(rows??[]) as any[];const list=allProducts.filter((row)=>row.status==='published');const ids=list.map((row)=>row.id);const [covers,versions]=await Promise.all([coverMap(supabase,ids),versionMap(supabase,ids)]);
  const revenue=new Map<string,number>();const sales=new Map<string,number>();for(const item of (orders??[]) as any[]){revenue.set(item.product_id,(revenue.get(item.product_id)??0)+pounds(item.vendor_net_pence));sales.set(item.product_id,(sales.get(item.product_id)??0)+1);}
  const products=list.map((row)=>blankProduct(row,imageUrl(supabase,covers.get(row.id)?.storage_path),versions.get(row.id),revenue.get(row.id)??0,sales.get(row.id)??Number(row.sales_count??0)));
  const totals={revenue:((orders??[]) as any[]).reduce((sum,item)=>sum+pounds(item.vendor_net_pence),0),sales:(orders??[]).length,views:allProducts.reduce((sum,row)=>sum+Number(row.view_count??0),0),published:products.length,pending:allProducts.filter((row)=>['in_review','changes_requested','rejected'].includes(row.status)).length};
  const dayKeys=Array.from({length:365},(_,index)=>{const date=new Date();date.setUTCDate(date.getUTCDate()-(364-index));return date.toISOString().slice(0,10)});const revenueMap=new Map<string,number>();const salesMap=new Map<string,number>();for(const item of (orders??[]) as any[]){const key=String(item.created_at).slice(0,10);revenueMap.set(key,(revenueMap.get(key)??0)+pounds(item.vendor_net_pence));salesMap.set(key,(salesMap.get(key)??0)+1);}
  return{products,totals,revenueSeries:dayKeys.map((key)=>revenueMap.get(key)??0),salesSeries:dayKeys.map((key)=>salesMap.get(key)??0),trafficSources:[{label:'AssetGuru search',value:0,tone:'cyan'},{label:'Category browsing',value:0,tone:'violet'},{label:'External links',value:0,tone:'magenta'},{label:'Creator followers',value:0,tone:'blue'},{label:'Collections',value:0,tone:'green'}]};
}

export async function loadVendorPayouts(supabase:SupabaseClient<any>,userId:string){
  const vendor=await vendorForUser(supabase,userId);const {data,error}=await supabase.from('payouts').select('*').eq('vendor_id',vendor.id).order('created_at',{ascending:false});if(error)throw error;
  return{payouts:((data??[]) as any[]).map((row)=>({id:row.stripe_transfer_id??row.id,date:dateShort(row.created_at),gross:pounds(row.gross_pence),refunds:pounds(row.refunded_pence),fees:pounds(row.commission_pence),net:pounds(row.net_pence-row.refunded_pence),status:row.status==='paid'?'Paid':row.status==='failed'?'Failed':'Pending'}))};
}

export async function loadVendorDashboard(supabase:SupabaseClient<any>,userId:string){
  const [analytics,orders,payoutBundle,pendingBundle]=await Promise.all([
    loadVendorAnalytics(supabase,userId),loadVendorOrders(supabase,userId,1,5),loadVendorPayouts(supabase,userId),loadVendorProducts(supabase,userId,{page:1,pageSize:8,status:'In review,Changes required',sort:'Recently updated'})
  ]);
  const productIds=analytics.products.map((product)=>product.id).filter((id):id is string=>Boolean(id));
  const reviewResult=productIds.length?await supabase.from('reviews').select('rating,body,created_at,buyer:profiles(display_name),product:products(title)').in('product_id',productIds).eq('status','published').order('created_at',{ascending:false}).limit(20):{data:[],error:null};
  if(reviewResult.error)throw reviewResult.error;
  const topProducts=[...analytics.products].sort((a,b)=>b.revenue-a.revenue).slice(0,5);const pending=pendingBundle.products.slice(0,8);
  const reviews=((reviewResult.data??[]) as any[]).map((review)=>({buyer:review.buyer?.display_name??'Verified buyer',product:review.product?.title??'Asset',rating:Number(review.rating??0),quote:review.body??'',date:dateShort(review.created_at)}));
  return{products:[...topProducts,...pending.filter((item)=>!topProducts.some((top)=>top.slug===item.slug))],orders:orders.orders,payouts:payoutBundle.payouts,revenueSeries:analytics.revenueSeries.slice(-20),salesSeries:analytics.salesSeries.slice(-20),trafficSources:analytics.trafficSources,totals:{...analytics.totals,pending:pendingBundle.counts.inReview+pendingBundle.counts.changesRequired,published:pendingBundle.counts.published},reviews};
}
