import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';
import { isR2ObjectKey, verifyR2Object } from '$lib/server/r2-storage';

async function legacyObjectAvailable(admin:ReturnType<typeof getSupabaseAdmin>, path:string|null|undefined) {
  if(!path)return false;
  const {data,error}=await admin.storage.from('asset-packages').createSignedUrl(path,60);
  return !error && Boolean(data?.signedUrl);
}

export async function GET({locals,params}:import('./$types').RequestEvent) {
  try {
    await requireRole(locals,['admin']);
    const admin=getSupabaseAdmin();
    const {data:versions,error}=await admin
      .from('product_versions')
      .select('id,package_path,documentation_path,file_size_bytes,is_current,status,created_at')
      .eq('product_id',params.id)
      .order('created_at',{ascending:false});
    if(error)throw error;
    const rows=(versions??[]) as any[];
    const version=rows.find(entry=>entry.status==='pending')??rows.find(entry=>entry.is_current)??rows[0]??null;
    if(!version)return json({packageVerified:false,documentationVerified:null},{headers:{'cache-control':'private, no-store, max-age=0'}});

    const packageCheck=version.package_path
      ? (isR2ObjectKey(version.package_path)
          ? verifyR2Object(version.package_path,Number(version.file_size_bytes)).then(result=>result.ok)
          : legacyObjectAvailable(admin,version.package_path))
      : Promise.resolve(false);
    const documentationCheck=version.documentation_path
      ? (isR2ObjectKey(version.documentation_path)
          ? verifyR2Object(version.documentation_path).then(result=>result.ok)
          : legacyObjectAvailable(admin,version.documentation_path))
      : Promise.resolve(null);
    const [packageVerified,documentationVerified]=await Promise.all([packageCheck,documentationCheck]);
    return json({packageVerified,documentationVerified},{headers:{'cache-control':'private, no-store, max-age=0'}});
  } catch(error) {
    const e=apiError(error);
    return json({message:e.message},{status:e.status});
  }
}
