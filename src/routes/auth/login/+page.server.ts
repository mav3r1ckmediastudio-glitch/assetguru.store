import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const safeNext = (value: FormDataEntryValue | string | null) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { user } = await locals.safeGetSession();
  if (user) redirect(303, '/account');
  const next=safeNext(url.searchParams.get('next'));
  const destination=url.searchParams.get('as')==='creator'||next.startsWith('/creator')?'creator':'buyer';
  return { next, destination };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const next = safeNext(form.get('next'));
    const destination = form.get('destination') === 'creator' ? 'creator' : 'buyer';
    if (!email || !password) return fail(400, { message: 'Enter your email address and password.', email, next, destination });

    const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return fail(400, { message: error?.message ?? 'Sign-in failed.', email, next, destination });

    if (destination === 'creator') {
      const { data: vendor, error: vendorError } = await locals.supabase
        .from('vendor_profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (vendorError) return fail(500, { message:'Your creator account could not be checked. Please try again.', email, next, destination });
      if (!vendor) redirect(303, '/account?creator=unavailable');
      redirect(303, next.startsWith('/creator') ? next : '/creator');
    }

    const buyerTarget = next && !next.startsWith('/creator') && !next.startsWith('/admin') ? next : '/account';
    redirect(303, buyerTarget);
  }
};
