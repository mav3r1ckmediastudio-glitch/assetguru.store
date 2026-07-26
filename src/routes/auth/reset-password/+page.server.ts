import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) redirect(303, '/auth/verify?state=expired');
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    if (password.length < 8) return fail(400, { message: 'Use a password of at least eight characters.' });
    if (password !== confirm) return fail(400, { message: 'The two passwords do not match.' });
    const { error } = await locals.supabase.auth.updateUser({ password });
    if (error) return fail(400, { message: error.message });
    redirect(303, '/account?password=updated');
  }
};
