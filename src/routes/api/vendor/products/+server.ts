import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const baseFile=z.object({name:z.string().min(1).max(255),size:z.number().int().min(1),type:z.string().max(120).default('application/octet-stream')});
const packageFile=baseFile.refine(file=>file.size<=5*1024**3,'Asset packages cannot exceed 5 GB.');
const documentationFile=baseFile.refine(file=>file.size<=250*1024**2,'Documentation cannot exceed 250 MB.');
const previewFile=baseFile.refine(file=>file.size<=15*1024**2,'Preview images cannot exceed 15 MB.').refine(file=>['image/jpeg','image/png','image/webp','image/gif'].includes(file.type),'Preview files must be JPG, PNG, WebP or GIF.');
const schema=z.object({
  title:z.string().trim().min(5).max(120),summary:z.string().trim().min(20).max(300),description:z.string().trim().min(60).max(12000),
  category:z.string().min(1),subcategory:z.string().max(100).default(''),price:z.number().min(0).max(9999),extendedPrice:z.number().min(0).max(24999),
  version:z.string().trim().min(1).max(40),compatibility:z.string().max(120).default('GameGuru MAX'),maxVersion:z.enum(['2024+','2025+','2026+','Any MAX build']).default('Any MAX build'),
  sourceFiles:z.boolean().default(false),dependencies:z.string().max(300).default('None'),performance:z.enum(['Lightweight','Mid-range','High detail']).default('Mid-range'),
  features:z.array(z.string().max(180)).max(50).default([]),contents:z.array(z.string().max(180)).max(100).default([]),tags:z.array(z.string().max(50)).max(30).default([]),formats:z.array(z.string().max(30)).max(30).default([]),licence:z.string().max(200).default('Standard commercial licence'),
  mode:z.enum(['draft','review']),files:z.object({package:packageFile,documentation:documentationFile.optional(),previews:z.array(previewFile).min(1).max(12)})
});
const safe=(value:string)=>value.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-150)||'file';
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export async function POST({locals,request}:import('./$types').RequestEvent){
  let createdProductId:string|undefined;
  try{
    const {user}=await requireRole(locals,['vendor']);
    const body=schema.parse(await request.json());
    const admin=getSupabaseAdmin();
    const [{data:vendor},{data:settings}]=await Promise.all([
      admin.from('vendor_profiles').select('*').eq('user_id',user.id).single(),
      admin.from('marketplace_settings').select('*').eq('id',1).single()
    ]);
    if(!vendor||vendor.status!=='approved')return json({message:'Your creator account must be approved before uploading assets.'},{status:403});
    if(!vendor.stripe_payouts_enabled)return json({message:'Complete Stripe onboarding before uploading assets.'},{status:403});
    if(settings?.maintenance_mode)return json({message:'Vendor uploads are paused during maintenance.'},{status:503});

    const pricePence=Math.round(body.price*100),extendedPence=Math.round(body.extendedPrice*100);
    if(pricePence===0&&!settings?.allow_free_assets)return json({message:'Free assets are currently disabled.'},{status:400});
    if(pricePence>0&&pricePence<Number(settings?.minimum_price_pence??0))return json({message:`The minimum product price is £${(Number(settings?.minimum_price_pence??0)/100).toFixed(2)}.`},{status:400});
    if(extendedPence<pricePence)return json({message:'Extended licence price cannot be below the standard price.'},{status:400});

    const categoryQuery=admin.from('categories').select('id,name');
    const {data:category}=await (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.category)?categoryQuery.eq('id',body.category).maybeSingle():categoryQuery.eq('name',body.category).maybeSingle());
    if(!category)return json({message:'Choose a valid category.'},{status:400});

    let slug=slugify(body.title);
    const {data:existing}=await admin.from('products').select('id').eq('slug',slug).maybeSingle();
    if(existing)slug=`${slug}-${crypto.randomUUID().slice(0,6)}`;
    const {data:product,error:productError}=await admin.from('products').insert({vendor_id:vendor.id,category_id:category.id,slug,title:body.title,subcategory:body.subcategory,summary:body.summary,description:body.description,price_pence:pricePence,extended_price_pence:extendedPence,status:'draft',compatibility:body.compatibility,max_version:body.maxVersion,source_files:body.sourceFiles,dependencies:body.dependencies,performance:body.performance,features:body.features,contents:body.contents,tags:body.tags,formats:body.formats,licence:body.licence}).select('*').single();
    if(productError)throw productError;
    createdProductId=product.id;

    const root=`${vendor.id}/${product.id}/${safe(body.version)}`;
    const packagePath=`${root}/package/${safe(body.files.package.name)}`;
    const docsPath=body.files.documentation?`${root}/documentation/${safe(body.files.documentation.name)}`:null;
    const {data:version,error:versionError}=await admin.from('product_versions').insert({product_id:product.id,version:body.version,package_path:packagePath,documentation_path:docsPath,file_size_bytes:body.files.package.size,status:'pending',is_current:false,release_notes:'Initial release'}).select('*').single();
    if(versionError)throw versionError;

    const previewRows=body.files.previews.map((preview,index)=>({product_id:product.id,storage_path:`${root}/images/${String(index+1).padStart(2,'0')}-${safe(preview.name)}`,alt_text:`${body.title} preview ${index+1}`,image_type:index===0?'cover':'gallery',sort_order:index}));
    const {data:images,error:imageError}=await admin.from('product_images').insert(previewRows).select('*');
    if(imageError)throw imageError;

    const uploadSpecs=[
      {bucket:'asset-packages',path:packagePath,role:'package',file:body.files.package},
      ...(body.files.documentation?[{bucket:'asset-packages',path:docsPath!,role:'documentation',file:body.files.documentation}]:[]),
      ...(images??[]).map((image:any,index:number)=>({bucket:'product-images',path:image.storage_path,role:`preview-${index}`,file:body.files.previews[index]}))
    ];
    const uploads=[];
    for(const spec of uploadSpecs){
      const {data,error}=await admin.storage.from(spec.bucket).createSignedUploadUrl(spec.path,{upsert:false});
      if(error||!data)throw error??new Error('SIGNED_UPLOAD_FAILED');
      uploads.push({bucket:spec.bucket,path:spec.path,token:data.token,role:spec.role,name:spec.file.name,type:spec.file.type,size:spec.file.size});
    }

    await writeAudit({actorId:user.id,actorRole:'vendor',action:'product.draft_created',entityType:'product',entityId:product.id,metadata:{slug,version:body.version,mode:body.mode},request});
    createdProductId=undefined;
    return json({product:{id:product.id,currentVersionId:version.id,slug,title:product.title,image:'/images/marketplace-grid.webp',category:category.name,status:'Draft',price:body.price,extendedPrice:body.extendedPrice,sales:0,revenue:0,views:0,conversion:0,rating:0,reviews:0,version:body.version,updated:'Just now',summary:body.summary,description:body.description,compatibility:body.compatibility,maxVersion:body.maxVersion,sourceFiles:body.sourceFiles,dependencies:body.dependencies,performance:body.performance,features:body.features,contents:body.contents,tags:body.tags,formats:body.formats,licence:body.licence,images:[],versions:[{id:version.id,version:body.version,status:'pending',isCurrent:false,size:`${Math.round(body.files.package.size/1024/1024)} MB`,created:'Just now',releaseNotes:'Initial release'}]},uploads,mode:body.mode});
  }catch(error){
    console.error(error);
    if(createdProductId)await getSupabaseAdmin().from('products').delete().eq('id',createdProductId);
    const e=apiError(error);
    return json({message:error instanceof z.ZodError?(error.issues[0]?.message??'Complete every required product field and select valid files.'):e.message},{status:error instanceof z.ZodError?400:e.status});
  }
}
