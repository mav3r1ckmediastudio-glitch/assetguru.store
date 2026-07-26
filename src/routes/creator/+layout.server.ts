import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
export const load:LayoutServerLoad=async({locals,url})=>{const {user}=await locals.safeGetSession();if(!user)redirect(303,`/auth/login?next=${encodeURIComponent(url.pathname+url.search)}`);const {data:profile}=await locals.supabase.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='vendor')redirect(303,'/auth/signup?role=vendor');return{};};
