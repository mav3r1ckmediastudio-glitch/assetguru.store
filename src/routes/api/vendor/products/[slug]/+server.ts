import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const schema=z.object({
  title:z.string().trim().min(5).max(120).optional(),summary:z.string().trim().min(20).max(300).optional(),description:z.string().trim().min(60).max(12000).optional(),
  price:z.number().min(0).max(9999).optional(),extendedPrice:z.number().min(0).max(24999).optional(),version:z.string().min(1).max(40).optional(),
  status:z.enum(['Published','Draft','In review','Changes required','Retired']).optional(),category:z.string().optional(),compatibility:z.string().max(120).optional(),
  maxVersion:z.enum(['2024+','2025+','2026+','Any MAX build']).optional(),sourceFiles:z.boolean().optional(),dependencies:z.string().max(300).optional(),
  performance:z.enum(['Lightweight','Mid-range','High detail']).optional(),features:z.array(z.string().max(180)).max(50).optional(),contents:z.array(z.string().max(180)).max(100).optional(),
  tags:z.array(z.string().max(50)).max(30).optional(),formats:z.array(z.string().max(30)).max(30).optional(),licence:z.string().max(200).optional()
});
const statusMap={Published:'published',Draft:'draft','In review':'in_review','Changes required':'changes_requested',Retired:'retired'} as const;
const displayStatus=(status:string)=>({published:'Published',draft:'Draft',in_review:'In review',changes_requested:'Changes required',retired:'Retired',rejected:'Changes required'} as any)[status]??'Draft';

async function objectExists(bucket:string,path:string){
  const admin=getSupabaseAdmin();const parts=path.split('/');const name=parts.pop()!;const folder=parts.join('/');
  const {data,error}=await admin.storage.from(bucket).list(folder,{limit:10,search:name});if(error)throw error;
  return Boolean(data?.some(item=>item.name===name));
}

export async function PATCH({locals,request,params}:import('./$types').RequestEvent){
  try{
    const {user}=await requireRole(locals,['vendor']);
    const body=schema.parse(await request.json());
    const admin=getSupabaseAdmin();
    const [{data:vendor,error:vendorError},{data:settings,error:settingsError}]=await Promise.all([
      admin.from('vendor_profiles').select('*').eq('user_id',user.id).single(),
      admin.from('marketplace_settings').select('*').eq('id',1).single()
    ]);
    if(vendorError)throw vendorError;
    if(settingsError)throw settingsError;
    if(!vendor)throw Object.assign(new Error('Vendor profile not found.'),{status:404});
    const {data:product}=await admin.from('products').select(`*,category:categories(name),images:product_images(storage_path,sort_order),versions:product_versions(id,version,is_current,status,package_path,documentation_path,file_size_bytes,release_notes,created_at)`).eq('vendor_id',vendor.id).eq('slug',params.slug).single();
    if(!product)return json({message:'Product not found.'},{status:404});

    const effectivePrice=Math.round((body.price??product.price_pence/100)*100);
    const currentExtended=product.extended_price_pence==null?(effectivePrice/100)*2.5:product.extended_price_pence/100;
    const effectiveExtended=Math.round((body.extendedPrice??currentExtended)*100);
    if(effectivePrice===0&&!settings?.allow_free_assets)return json({message:'Free assets are currently disabled.'},{status:400});
    if(effectivePrice>0&&effectivePrice<Number(settings?.minimum_price_pence??0))return json({message:`The minimum product price is £${(Number(settings?.minimum_price_pence??0)/100).toFixed(2)}.`},{status:400});
    if(effectiveExtended<effectivePrice)return json({message:'Extended licence price cannot be below the standard price.'},{status:400});

    const patch:any={};
    if(body.title!==undefined)patch.title=body.title;if(body.summary!==undefined)patch.summary=body.summary;if(body.description!==undefined)patch.description=body.description;
    if(body.price!==undefined)patch.price_pence=effectivePrice;if(body.extendedPrice!==undefined)patch.extended_price_pence=effectiveExtended;
    if(body.compatibility!==undefined)patch.compatibility=body.compatibility;if(body.maxVersion!==undefined)patch.max_version=body.maxVersion;if(body.sourceFiles!==undefined)patch.source_files=body.sourceFiles;
    if(body.dependencies!==undefined)patch.dependencies=body.dependencies;if(body.performance!==undefined)patch.performance=body.performance;if(body.features!==undefined)patch.features=body.features;
    if(body.contents!==undefined)patch.contents=body.contents;if(body.tags!==undefined)patch.tags=body.tags;if(body.formats!==undefined)patch.formats=body.formats;if(body.licence!==undefined)patch.licence=body.licence;
    if(body.category){const {data:category}=await admin.from('categories').select('id').eq('name',body.category).maybeSingle();if(!category)return json({message:'Choose a valid category.'},{status:400});patch.category_id=category.id;}

    if(body.status){
      const next=statusMap[body.status];
      if(next==='published'&&product.status!=='published')return json({message:'Only an administrator can publish a product.'},{status:403});
      if(next==='in_review'){
        if(vendor.status!=='approved'||!vendor.stripe_payouts_enabled)return json({message:'Vendor approval and Stripe onboarding are required.'},{status:403});
        const latest=[...(product.versions??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
        if(!latest||!(await objectExists('asset-packages',latest.package_path)))return json({message:'Complete the asset package upload before submitting for review.'},{status:409});
        if(latest.documentation_path&&!(await objectExists('asset-packages',latest.documentation_path)))return json({message:'The documentation upload is incomplete.'},{status:409});
        for(const image of product.images??[])if(!(await objectExists('product-images',image.storage_path)))return json({message:'One or more preview uploads are incomplete.'},{status:409});
      }
      patch.status=next;
    }

    const {data:updated,error}=await admin.from('products').update(patch).eq('id',product.id).select(`*,category:categories(name),images:product_images(storage_path,sort_order),versions:product_versions(id,version,is_current,status,file_size_bytes,release_notes,created_at)`).single();
    if(error)throw error;
    if(body.version){const latest=[...(updated.versions??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))[0];if(latest){const {error:versionError}=await admin.from('product_versions').update({version:body.version}).eq('id',latest.id);if(versionError)throw versionError;}}
    const sortedImages=[...(updated.images??[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);
    const sortedVersions=[...(updated.versions??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));
    const latest=sortedVersions.find((entry:any)=>entry.is_current)??sortedVersions[0];
    const imageUrl=sortedImages[0]?admin.storage.from('product-images').getPublicUrl(sortedImages[0].storage_path).data.publicUrl:'/images/marketplace-grid.webp';
    await writeAudit({actorId:user.id,actorRole:'vendor',action:'product.updated',entityType:'product',entityId:product.id,metadata:body,request});
    return json({product:{id:updated.id,currentVersionId:latest?.id,slug:updated.slug,title:updated.title,image:imageUrl,images:sortedImages.map((entry:any)=>admin.storage.from('product-images').getPublicUrl(entry.storage_path).data.publicUrl),category:updated.category?.name??'Uncategorised',status:displayStatus(updated.status),price:updated.price_pence/100,extendedPrice:updated.extended_price_pence==null?undefined:updated.extended_price_pence/100,summary:updated.summary,description:updated.description,compatibility:updated.compatibility,maxVersion:updated.max_version,sourceFiles:updated.source_files,dependencies:updated.dependencies,performance:updated.performance,features:updated.features,contents:updated.contents,tags:updated.tags,formats:updated.formats,licence:updated.licence,sales:updated.sales_count,revenue:0,views:updated.view_count,conversion:0,rating:Number(updated.rating_average),reviews:updated.review_count,version:body.version??latest?.version??'1.0.0',versions:sortedVersions.map((entry:any)=>({id:entry.id,version:entry.version,status:entry.status,isCurrent:Boolean(entry.is_current),size:entry.file_size_bytes?`${Math.round(entry.file_size_bytes/1024/1024)} MB`:'0 MB',created:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(entry.created_at)),releaseNotes:entry.release_notes??''})),updated:'Just now',moderationNote:updated.moderation_notes||undefined}});
  }catch(error){const e=apiError(error);return json({message:error instanceof z.ZodError?'Invalid product update.':e.message},{status:error instanceof z.ZodError?400:e.status});}
}

export async function DELETE({locals,request,params}:import('./$types').RequestEvent){
  try{
    const {user}=await requireRole(locals,['vendor']);const admin=getSupabaseAdmin();
    const {data:vendor,error:vendorError}=await admin.from('vendor_profiles').select('id').eq('user_id',user.id).single();
    if(vendorError)throw vendorError;
    if(!vendor)throw Object.assign(new Error('Vendor profile not found.'),{status:404});
    const {data:product}=await admin.from('products').select(`id,status,sales_count,images:product_images(storage_path),versions:product_versions(package_path,documentation_path)`).eq('vendor_id',vendor.id).eq('slug',params.slug).single();
    if(!product)return json({message:'Product not found.'},{status:404});
    if(product.sales_count>0||!['draft','changes_requested','rejected'].includes(product.status))return json({message:'Only unsold drafts can be deleted. Retire published products instead.'},{status:409});
    const imagePaths=((product.images??[]) as any[]).map(item=>item.storage_path).filter(Boolean);
    const packagePaths=((product.versions??[]) as any[]).flatMap(item=>[item.package_path,item.documentation_path]).filter(Boolean);
    if(imagePaths.length){const {error}=await admin.storage.from('product-images').remove(imagePaths);if(error)throw error;}
    if(packagePaths.length){const {error}=await admin.storage.from('asset-packages').remove(packagePaths);if(error)throw error;}
    const {error}=await admin.from('products').delete().eq('id',product.id);if(error)throw error;
    await writeAudit({actorId:user.id,actorRole:'vendor',action:'product.deleted',entityType:'product',entityId:product.id,request});
    return json({ok:true});
  }catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}
}
