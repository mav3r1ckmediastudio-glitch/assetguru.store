import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';

const dateTimeShort = (value:string|null|undefined) => value
  ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value))
  : '—';
const bytes = (value:number|null|undefined) => {
  const amount=Number(value??0);
  if(amount>=1024**3)return `${(amount/1024**3).toFixed(2)} GB`;
  if(amount>=1024**2)return `${(amount/1024**2).toFixed(amount>=100*1024**2?0:1)} MB`;
  if(amount>=1024)return `${(amount/1024).toFixed(1)} KB`;
  return `${amount} B`;
};

export async function GET({locals}:import('./$types').RequestEvent) {
  try {
    await requireRole(locals,['admin']);
    const admin=getSupabaseAdmin();
    const {data,error}=await admin
      .from('products')
      .select(`id,title,updated_at,published_at,price_pence,status,moderation_notes,vendor:vendor_profiles!products_vendor_id_fkey(display_name),category:categories(name),versions:product_versions(version,file_size_bytes,created_at,status)`)
      .eq('status','in_review')
      .order('updated_at',{ascending:false});
    if(error)throw error;
    const moderation=((data??[]) as any[]).map(row=>{
      const pending=[...(row.versions??[])]
        .filter((entry:any)=>entry.status==='pending')
        .sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
      return {
        id:row.id,
        databaseId:row.id,
        title:row.title,
        vendor:row.vendor?.display_name??'Creator',
        category:row.category?.name??'Uncategorised',
        submitted:dateTimeShort(row.updated_at),
        version:pending?.version??'—',
        type:row.published_at?'Version update':'Product submission',
        risk:row.price_pence===0?'Low':'Medium',
        status:'In review',
        files:bytes(pending?.file_size_bytes),
        notes:row.moderation_notes||undefined
      };
    });
    return json({moderation},{headers:{'cache-control':'private, no-store, max-age=0'}});
  } catch(error) {
    const e=apiError(error);
    return json({message:e.message},{status:e.status});
  }
}
