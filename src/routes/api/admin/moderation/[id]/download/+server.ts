import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import { createR2DownloadUrl, isR2ObjectKey } from '$lib/server/r2-storage';

const schema=z.object({kind:z.enum(['package','documentation'])});
const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'asset-download';
const pathName=(path:string)=>{const name=path.split('/').pop()??'asset-download';try{return decodeURIComponent(name);}catch{return name;}};

export async function POST({locals,request,params}:import('./$types').RequestEvent){
  try{
    const {user}=await requireRole(locals,['admin']);
    const body=schema.parse(await request.json());
    const admin=getSupabaseAdmin();
    const {data:product,error:productError}=await admin.from('products').select('id,title,slug').eq('id',params.id).single();
    if(productError||!product)return json({message:'Moderation item not found.'},{status:404});
    const {data:versions,error:versionError}=await admin.from('product_versions').select('*').eq('product_id',product.id).order('created_at',{ascending:false});
    if(versionError)throw versionError;
    const version=(versions??[]).find((entry:any)=>entry.status==='pending')??(versions??[]).find((entry:any)=>entry.is_current)??versions?.[0];
    if(!version)return json({message:'No product package is available.'},{status:404});
    const path=body.kind==='package'?version.package_path:version.documentation_path;
    if(!path)return json({message:body.kind==='package'?'No product package is available.':'No documentation file was supplied.'},{status:404});
    const originalName=pathName(path);
    const filename=safeName(`${product.slug}-${version.version}-${body.kind}${originalName.includes('.')?`.${originalName.split('.').pop()}`:''}`);
    let url:string;
    if(isR2ObjectKey(path))url=createR2DownloadUrl(path,filename,300);
    else{
      const {data,error}=await admin.storage.from('asset-packages').createSignedUrl(path,300,{download:filename});
      if(error||!data?.signedUrl)throw error??new Error('SIGNED_URL_FAILED');
      url=data.signedUrl;
    }
    await writeAudit({actorId:user.id,actorRole:'admin',action:`moderation.${body.kind}_downloaded`,entityType:'product',entityId:product.id,metadata:{version_id:version.id,version:version.version},request});
    return json({url,filename,expiresIn:300},{headers:{'cache-control':'no-store, max-age=0'}});
  }catch(error){
    const e=apiError(error);
    return json({message:error instanceof z.ZodError?'Choose a valid moderation download.':e.message},{status:error instanceof z.ZodError?400:e.status});
  }
}
