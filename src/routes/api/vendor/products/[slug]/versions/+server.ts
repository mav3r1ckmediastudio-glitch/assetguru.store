import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const file=z.object({name:z.string().min(1).max(255),size:z.number().int().min(1),type:z.string().max(120).default('application/octet-stream')});
const packageFile=file.refine(value=>value.size<=5*1024**3,'Asset packages cannot exceed 5 GB.');
const documentationFile=file.refine(value=>value.size<=250*1024**2,'Documentation cannot exceed 250 MB.');
const createSchema=z.object({version:z.string().trim().min(1).max(40),releaseNotes:z.string().trim().min(10).max(5000),package:packageFile,documentation:documentationFile.optional()});
const completeSchema=z.object({versionId:z.string().uuid()});
const safe=(value:string)=>value.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-150)||'file';

async function objectExists(bucket:string,path:string){
  const admin=getSupabaseAdmin();
  const parts=path.split('/');
  const name=parts.pop()!;
  const folder=parts.join('/');
  const {data,error}=await admin.storage.from(bucket).list(folder,{limit:10,search:name});
  if(error)throw error;
  return Boolean(data?.some(item=>item.name===name));
}

export async function POST({locals,request,params}:import('./$types').RequestEvent){
  let createdVersionId:string|undefined;
  try{
    const {user}=await requireRole(locals,['vendor']);
    const body=createSchema.parse(await request.json());
    const admin=getSupabaseAdmin();
    const {data:vendor}=await admin.from('vendor_profiles').select('*').eq('user_id',user.id).single();
    if(vendor.status!=='approved'||!vendor.stripe_payouts_enabled)return json({message:'Vendor approval and completed Stripe onboarding are required.'},{status:403});
    const {data:product}=await admin.from('products').select('id,slug,status').eq('vendor_id',vendor.id).eq('slug',params.slug).maybeSingle();
    if(!product)return json({message:'Product not found.'},{status:404});
    if(product.status==='in_review')return json({message:'Wait for the current moderation review before uploading another version.'},{status:409});
    const {data:existing,error:existingError}=await admin.from('product_versions').select('id,status,package_path,documentation_path').eq('product_id',product.id).eq('version',body.version).maybeSingle();
    if(existingError)throw existingError;
    if(existing){
      if(existing.status!=='pending')return json({message:'That version number already exists for this product.'},{status:409});
      const stalePaths=[existing.package_path,existing.documentation_path].filter((value):value is string=>Boolean(value));
      if(stalePaths.length){const {error:removeError}=await admin.storage.from('asset-packages').remove(stalePaths);if(removeError)throw removeError;}
      const {error:deleteError}=await admin.from('product_versions').delete().eq('id',existing.id);if(deleteError)throw deleteError;
    }

    const root=`${vendor.id}/${product.id}/${safe(body.version)}`;
    const packagePath=`${root}/package/${safe(body.package.name)}`;
    const docsPath=body.documentation?`${root}/documentation/${safe(body.documentation.name)}`:null;
    const {data:version,error:versionError}=await admin.from('product_versions').insert({product_id:product.id,version:body.version,package_path:packagePath,documentation_path:docsPath,file_size_bytes:body.package.size,status:'pending',is_current:false,release_notes:body.releaseNotes}).select('id').single();
    if(versionError)throw versionError;
    createdVersionId=version.id;

    const specs=[{bucket:'asset-packages',path:packagePath,role:'package',file:body.package},...(body.documentation?[{bucket:'asset-packages',path:docsPath!,role:'documentation',file:body.documentation}]:[])];
    const uploads=[];
    for(const spec of specs){
      const {data,error}=await admin.storage.from(spec.bucket).createSignedUploadUrl(spec.path,{upsert:false});
      if(error||!data)throw error??new Error('Signed upload could not be created.');
      uploads.push({bucket:spec.bucket,path:spec.path,token:data.token,role:spec.role,name:spec.file.name,type:spec.file.type,size:spec.file.size});
    }
    const {error:retireError}=await admin.from('product_versions').update({status:'rejected',is_current:false}).eq('product_id',product.id).eq('status','pending').neq('id',version.id);
    if(retireError)throw retireError;
    await writeAudit({actorId:user.id,actorRole:'vendor',action:'product.version_created',entityType:'product_version',entityId:version.id,metadata:{productId:product.id,version:body.version},request});
    return json({versionId:version.id,uploads});
  }catch(error){
    if(createdVersionId)await getSupabaseAdmin().from('product_versions').delete().eq('id',createdVersionId);
    const e=apiError(error);
    return json({message:error instanceof z.ZodError?'Enter a valid version number, release notes and package.':e.message},{status:error instanceof z.ZodError?400:e.status});
  }
}

export async function PATCH({locals,request,params}:import('./$types').RequestEvent){
  try{
    const {user}=await requireRole(locals,['vendor']);
    const body=completeSchema.parse(await request.json());
    const admin=getSupabaseAdmin();
    const {data:vendor}=await admin.from('vendor_profiles').select('id').eq('user_id',user.id).single();
    const {data:product}=await admin.from('products').select('id').eq('vendor_id',vendor.id).eq('slug',params.slug).maybeSingle();
    if(!product)return json({message:'Product not found.'},{status:404});
    const {data:version}=await admin.from('product_versions').select('*').eq('id',body.versionId).eq('product_id',product.id).maybeSingle();
    if(!version)return json({message:'Product version not found.'},{status:404});
    if(!(await objectExists('asset-packages',version.package_path)))return json({message:'The package upload did not complete.'},{status:409});
    if(version.documentation_path&&!(await objectExists('asset-packages',version.documentation_path)))return json({message:'The documentation upload did not complete.'},{status:409});
    const {error}=await admin.from('products').update({status:'in_review'}).eq('id',product.id);
    if(error)throw error;
    await writeAudit({actorId:user.id,actorRole:'vendor',action:'product.version_submitted',entityType:'product_version',entityId:version.id,metadata:{productId:product.id},request});
    return json({ok:true,status:'In review'});
  }catch(error){const e=apiError(error);return json({message:error instanceof z.ZodError?'Invalid version completion request.':e.message},{status:error instanceof z.ZodError?400:e.status});}
}
