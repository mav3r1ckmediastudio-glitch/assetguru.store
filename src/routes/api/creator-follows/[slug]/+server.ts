import { json } from '@sveltejs/kit';
import { apiError, getSupabaseAdmin, writeAudit } from '$lib/server/supabase';

async function vendorId(slug:string){
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.from('vendor_profiles').select('id').eq('slug',slug).eq('status','approved').maybeSingle();
  if(error)throw error;
  if(!data)throw Object.assign(new Error('Creator not found.'),{status:404});
  return data.id as string;
}

export async function GET({locals,params}:import('./$types').RequestEvent){
  try{
    const id=await vendorId(params.slug);
    if(!locals.user)return json({following:false});
    const {data,error}=await getSupabaseAdmin().from('creator_follows').select('vendor_id').eq('vendor_id',id).eq('user_id',locals.user.id).maybeSingle();
    if(error)throw error;
    return json({following:Boolean(data)});
  }catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}
}

export async function POST({locals,params,request}:import('./$types').RequestEvent){
  try{
    if(!locals.user)return json({message:'Sign in to follow creators.'},{status:401});
    const id=await vendorId(params.slug);
    const {error}=await getSupabaseAdmin().from('creator_follows').upsert({user_id:locals.user.id,vendor_id:id},{onConflict:'user_id,vendor_id'});
    if(error)throw error;
    await writeAudit({actorId:locals.user.id,actorRole:locals.profile?.role??'buyer',action:'creator.followed',entityType:'vendor_profile',entityId:id,request});
    return json({following:true});
  }catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}
}

export async function DELETE({locals,params,request}:import('./$types').RequestEvent){
  try{
    if(!locals.user)return json({message:'Sign in to manage followed creators.'},{status:401});
    const id=await vendorId(params.slug);
    const {error}=await getSupabaseAdmin().from('creator_follows').delete().eq('user_id',locals.user.id).eq('vendor_id',id);
    if(error)throw error;
    await writeAudit({actorId:locals.user.id,actorRole:locals.profile?.role??'buyer',action:'creator.unfollowed',entityType:'vendor_profile',entityId:id,request});
    return json({following:false});
  }catch(error){const e=apiError(error);return json({message:e.message},{status:e.status});}
}
