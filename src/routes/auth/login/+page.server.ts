import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const safeNext = (value: FormDataEntryValue | string | null) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/account';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { user } = await locals.safeGetSession();
  if (user) redirect(303, safeNext(url.searchParams.get('next')));
  return { next: safeNext(url.searchParams.get('next')) };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const next = safeNext(form.get('next'));
    if (!email || !password) return fail(400, { message: 'Enter your email address and password.', email, next });

    const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(400, { message: error.message, email, next });
    redirect(303, next);
  }
};
