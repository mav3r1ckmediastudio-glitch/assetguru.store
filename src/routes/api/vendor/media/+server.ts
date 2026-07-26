import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const requestSchema = z.object({
  kind: z.enum(['avatar','banner']),
  file: z.object({ name:z.string().min(1).max(255), size:z.number().int().positive(), type:z.enum(['image/jpeg','image/png','image/webp']) })
});
const completeSchema = z.object({ kind:z.enum(['avatar','banner']), path:z.string().min(3).max(500) });
const safe = (value:string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-140) || 'image';
const bucketFor = (kind:'avatar'|'banner') => kind === 'avatar' ? 'avatars' : 'storefront-banners';

async function objectExists(bucket:string,path:string) {
  const admin=getSupabaseAdmin(); const parts=path.split('/'); const name=parts.pop()!; const folder=parts.join('/');
  const {data,error}=await admin.storage.from(bucket).list(folder,{limit:20,search:name}); if(error)throw error;
  return Boolean(data?.some(item=>item.name===name));
}

export async function POST({locals,request}:import('./$types').RequestEvent) {
  try {
    const {user}=await requireRole(locals,['vendor']); const body=requestSchema.parse(await request.json()); const admin=getSupabaseAdmin();
    const {data:vendor,error:vendorError}=await admin.from('vendor_profiles').select('id').eq('user_id',user.id).single();
    if(vendorError)throw vendorError;
    if(!vendor)throw Object.assign(new Error('Vendor profile not found.'),{status:404});
    const limit=body.kind==='avatar'?5*1024*1024:15*1024*1024; if(body.file.size>limit)return json({message:`The ${body.kind} exceeds the upload limit.`},{status:400});
    const path=`${vendor.id}/${body.kind}/${crypto.randomUUID()}-${safe(body.file.name)}`; const bucket=bucketFor(body.kind);
    const {data,error}=await admin.storage.from(bucket).createSignedUploadUrl(path,{upsert:false}); if(error||!data)throw error??new Error('SIGNED_UPLOAD_FAILED');
    await writeAudit({actorId:user.id,actorRole:'vendor',action:`storefront.${body.kind}_upload_started`,entityType:'vendor_profile',entityId:vendor.id,metadata:{path,size:body.file.size,type:body.file.type},request});
    return json({bucket,path,token:data.token});
  } catch(error) { const e=apiError(error); return json({message:error instanceof z.ZodError?'Choose a valid JPG, PNG or WebP image.':e.message},{status:error instanceof z.ZodError?400:e.status}); }
}

export async function PATCH({locals,request}:import('./$types').RequestEvent) {
  try {
    const {user}=await requireRole(locals,['vendor']); const body=completeSchema.parse(await request.json()); const admin=getSupabaseAdmin();
    const {data:vendor,error:vendorError}=await admin.from('vendor_profiles').select('id,avatar_path,banner_path').eq('user_id',user.id).single();
    if(vendorError)throw vendorError;
    if(!vendor)throw Object.assign(new Error('Vendor profile not found.'),{status:404});
    if(!body.path.startsWith(`${vendor.id}/${body.kind}/`))return json({message:'Invalid storefront media path.'},{status:403});
    const bucket=bucketFor(body.kind); if(!(await objectExists(bucket,body.path)))return json({message:'The image upload did not complete.'},{status:409});
    const column=body.kind==='avatar'?'avatar_path':'banner_path'; const oldPath=body.kind==='avatar'?vendor.avatar_path:vendor.banner_path;
    const {error}=await admin.from('vendor_profiles').update({[column]:body.path}).eq('id',vendor.id); if(error)throw error;
    if(oldPath&&oldPath!==body.path)await admin.storage.from(bucket).remove([oldPath]);
    await writeAudit({actorId:user.id,actorRole:'vendor',action:`storefront.${body.kind}_updated`,entityType:'vendor_profile',entityId:vendor.id,metadata:{path:body.path},request});
    return json({url:admin.storage.from(bucket).getPublicUrl(body.path).data.publicUrl});
  } catch(error) { const e=apiError(error); return json({message:error instanceof z.ZodError?'Invalid storefront media request.':e.message},{status:error instanceof z.ZodError?400:e.status}); }
}
