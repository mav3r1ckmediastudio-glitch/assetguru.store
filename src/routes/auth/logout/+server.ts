import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function signOut(locals: App.Locals): Promise<never> {
  if (locals.supabase) await locals.supabase.auth.signOut();
  return redirect(303, '/');
}

export const GET: RequestHandler = ({ locals }) => signOut(locals);
export const POST: RequestHandler = ({ locals }) => signOut(locals);
