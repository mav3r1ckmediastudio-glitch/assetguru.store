import { env } from '$env/dynamic/public';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  return { signedIn: Boolean(user) };
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    if (!email) return fail(400, { message: 'Enter the email address used for your account.', email });

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.PUBLIC_SITE_URL || url.origin}/auth/callback?next=/auth/reset-password`
    });
    if (error) return fail(400, { message: error.message, email });
    return { success: true, email };
  }
};
