import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import { isR2ObjectKey, verifyR2Object } from '$lib/server/r2-storage';

const schema = z.object({
  status: z.enum(['Queued','In review','Changes requested','Approved','Rejected']),
  notes: z.string().max(5000).optional()
}).superRefine((value, context) => {
  if (['Changes requested','Rejected'].includes(value.status) && (value.notes?.trim().length ?? 0) < 10) {
    context.addIssue({ code:'custom', path:['notes'], message:'Add at least 10 characters explaining this decision.' });
  }
});
const statusMap = { Queued:'draft', 'In review':'in_review', 'Changes requested':'changes_requested', Approved:'published', Rejected:'rejected' } as const;
const displayStatus = (value:string) => value === 'in_review' ? 'In review' : value === 'changes_requested' ? 'Changes requested' : value === 'published' ? 'Approved' : value === 'rejected' ? 'Rejected' : 'Queued';
const dateTime = (value:string|null|undefined) => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '—';
const bytes = (value:number|null|undefined) => { const amount=Number(value??0); if(amount>=1024**3)return `${(amount/1024**3).toFixed(2)} GB`; if(amount>=1024**2)return `${(amount/1024**2).toFixed(amount>=100*1024**2?0:1)} MB`; if(amount>=1024)return `${(amount/1024).toFixed(1)} KB`; return `${amount} B`; };
const fileName = (path:string|null|undefined) => { const name=String(path??'').split('/').pop()??''; try{return decodeURIComponent(name);}catch{return name;} };

async function legacyObjectAvailable(admin:ReturnType<typeof getSupabaseAdmin>, path:string|null|undefined) {
  if (!path) return false;
  const { data, error } = await admin.storage.from('asset-packages').createSignedUrl(path, 60);
  return !error && Boolean(data?.signedUrl);
}

export async function GET({ locals, params }: import('./$types').RequestEvent) {
  try {
    await requireRole(locals, ['admin']);
    const admin = getSupabaseAdmin();
    const [{ data:product, error:productError }, { data:history, error:historyError }] = await Promise.all([
      admin.from('products').select(`*,category:categories(id,name,slug),vendor:vendor_profiles!products_vendor_id_fkey(id,display_name,handle,status,support_email,location,response_time,created_at),images:product_images(id,storage_path,alt_text,image_type,sort_order,created_at),versions:product_versions(id,version,package_path,documentation_path,release_notes,file_size_bytes,is_current,status,approved_at,created_at)`).eq('id', params.id).single(),
      admin.from('audit_log').select('id,action,actor_role,metadata,created_at').eq('entity_type','product').eq('entity_id',params.id).order('created_at',{ascending:false}).limit(30)
    ]);
    if (productError || !product) return json({ message:'Moderation item not found.' }, { status:404 });
    if (historyError) throw historyError;

    const images=[...(product.images??[])].sort((a:any,b:any)=>Number(a.sort_order)-Number(b.sort_order));
    const versions=[...(product.versions??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));
    const version=versions.find((entry:any)=>entry.status==='pending')??versions.find((entry:any)=>entry.is_current)??versions[0]??null;
    let packageVerified=false;
    let documentationVerified:null|boolean=null;
    if(version?.package_path){
      packageVerified=isR2ObjectKey(version.package_path)
        ? (await verifyR2Object(version.package_path,Number(version.file_size_bytes))).ok
        : await legacyObjectAvailable(admin,version.package_path);
    }
    if(version?.documentation_path){
      documentationVerified=isR2ObjectKey(version.documentation_path)
        ? (await verifyR2Object(version.documentation_path)).ok
        : await legacyObjectAvailable(admin,version.documentation_path);
    }
    const auditRows=(history??[]) as any[];
    const declarationRecorded=auditRows.some((entry:any)=>entry.metadata?.declarationAccepted===true || entry.metadata?.declaration_accepted===true);
    const risk=product.price_pence===0?'Low':'Medium';
    return json({ detail:{
      id:product.id, slug:product.slug, title:product.title, status:displayStatus(product.status), risk,
      type:product.published_at?'Version update':'Product submission', submitted:dateTime(product.updated_at), updated:dateTime(product.updated_at),
      published:product.published_at?dateTime(product.published_at):undefined, moderationNotes:product.moderation_notes||undefined,
      vendor:{ id:product.vendor?.id??'', name:product.vendor?.display_name??'Creator', handle:product.vendor?.handle??'', status:product.vendor?.status??'unknown', email:product.vendor?.support_email??'', location:product.vendor?.location??'', responseTime:product.vendor?.response_time??'', joined:dateTime(product.vendor?.created_at) },
      category:product.category?.name??'Uncategorised', subcategory:product.subcategory??'', summary:product.summary??'', description:product.description??'',
      price:Number(product.price_pence??0)/100, extendedPrice:product.extended_price_pence==null?undefined:Number(product.extended_price_pence)/100,
      licence:product.licence??'', compatibility:product.compatibility??'', maxVersion:product.max_version??'', sourceFiles:Boolean(product.source_files),
      dependencies:product.dependencies??'', performance:product.performance??'', features:product.features??[], contents:product.contents??[], tags:product.tags??[], formats:product.formats??[],
      showcaseVideoUrl:product.showcase_video_url||undefined,
      images:images.map((entry:any)=>({ id:entry.id, url:admin.storage.from('product-images').getPublicUrl(entry.storage_path).data.publicUrl, altText:entry.alt_text??'', imageType:entry.image_type==='cover'?'cover':'gallery', sortOrder:Number(entry.sort_order??0) })),
      version:version?{ id:version.id, version:version.version, status:version.status, size:bytes(version.file_size_bytes), sizeBytes:Number(version.file_size_bytes??0), releaseNotes:version.release_notes??'', packageName:fileName(version.package_path), documentationName:version.documentation_path?fileName(version.documentation_path):undefined, created:dateTime(version.created_at), packageVerified, documentationVerified }:null,
      declaration:{ recorded:declarationRecorded, text:declarationRecorded?'The creator declaration was recorded with this submission.':'No separate creator-declaration record exists for this submission. Verify ownership and listing accuracy during review.' },
      history:auditRows.map((entry:any)=>({ id:String(entry.id), action:String(entry.action??'event').replaceAll('_',' '), actorRole:entry.actor_role??'system', created:dateTime(entry.created_at), notes:entry.metadata?.notes??entry.metadata?.reason??undefined }))
    } }, { headers:{'cache-control':'no-store, max-age=0'} });
  } catch (error) {
    console.error('Moderation detail failed',error);
    const e=apiError(error);
    return json({message:e.message},{status:e.status});
  }
}

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['admin']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: product } = await admin.from('products').select('id,title,slug,vendor_id,status,published_at').eq('id', params.id).single();
    if (!product) return json({ message: 'Moderation item not found.' }, { status: 404 });
    if (product.status !== 'in_review') return json({ message: 'This submission is no longer awaiting moderation.' }, { status: 409 });

    const next = statusMap[body.status];
    if (!['published','changes_requested','rejected'].includes(next)) return json({ message: 'Choose an approval, changes-requested or rejection decision.' }, { status: 400 });

    const { data: pendingVersions, error: versionsError } = await admin
      .from('product_versions')
      .select('id,created_at')
      .eq('product_id', product.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (versionsError) throw versionsError;
    const submittedVersion = pendingVersions?.[0];
    if (!submittedVersion) return json({ message: 'This product has no uploaded version ready for moderation.' }, { status: 409 });

    const patch: Record<string, unknown> = { status: next, moderation_notes: body.notes?.trim() ?? '' };
    if (next === 'published' && !product.published_at) patch.published_at = new Date().toISOString();
    const { error } = await admin.from('products').update(patch).eq('id', product.id);
    if (error) throw error;

    if (next === 'published') {
      const approvedAt = new Date().toISOString();
      const { error: currentError } = await admin.from('product_versions').update({ is_current: false }).eq('product_id', product.id);
      if (currentError) throw currentError;
      const { error: approveError } = await admin.from('product_versions').update({ status:'approved', is_current:true, approved_at:approvedAt, approved_by:user.id }).eq('id', submittedVersion.id);
      if (approveError) throw approveError;
      const { error: supersedeError } = await admin.from('product_versions').update({ status:'rejected', is_current:false }).eq('product_id', product.id).eq('status','pending').neq('id',submittedVersion.id);
      if (supersedeError) throw supersedeError;
    } else if (next === 'rejected') {
      const { error: rejectError } = await admin.from('product_versions').update({ status:'rejected', is_current:false }).eq('id', submittedVersion.id);
      if (rejectError) throw rejectError;
    }

    const { data: vendor } = await admin.from('vendor_profiles').select('user_id').eq('id', product.vendor_id).single();
    if (vendor?.user_id) {
      await admin.from('notifications').upsert({
        user_id: vendor.user_id,
        type: next === 'published' ? 'success' : 'moderation',
        title: next === 'published' ? 'Asset approved' : 'Asset moderation update',
        body: `${product.title} is now ${body.status.toLowerCase()}.${body.notes ? ` ${body.notes.trim()}` : ''}`,
        href: `/creator/products/${product.slug}`,
        dedupe_key: `moderation:${product.id}:${submittedVersion.id}:${next}`
      }, { onConflict: 'dedupe_key' });
    }
    await writeAudit({ actorId:user.id, actorRole:'admin', action:`product.${next}`, entityType:'product', entityId:product.id, metadata:{ notes:body.notes?.trim() ?? '', version_id:submittedVersion.id }, request });
    return json({ ok:true });
  } catch (error) {
    const e = apiError(error);
    return json({ message:error instanceof z.ZodError ? (error.issues[0]?.message ?? 'Invalid moderation decision.') : e.message }, { status:error instanceof z.ZodError ? 400 : e.status });
  }
}
