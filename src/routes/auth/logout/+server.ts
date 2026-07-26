import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function signOut(locals: App.Locals) {
  if (locals.supabase) await locals.supabase.auth.signOut();
  redirect(303, '/');
}

export const GET: RequestHandler = async ({ locals }) => signOut(locals);
export const POST: RequestHandler = async ({ locals }) => signOut(locals);
