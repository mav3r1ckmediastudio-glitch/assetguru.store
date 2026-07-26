import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load:PageServerLoad=async({locals,url})=>{const {user}=await locals.safeGetSession();if(!user)redirect(303,`/auth/login?next=${encodeURIComponent(url.pathname)}`);return{};};
