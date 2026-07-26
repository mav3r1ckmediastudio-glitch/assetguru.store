import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const safeNext = (value: string | null) => value?.startsWith('/') && !value.startsWith('//') ? value : '/account';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(303, next);
  }
  redirect(303, '/auth/verify?state=failed');
};
