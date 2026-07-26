import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
  depends('supabase:auth');
  if (!locals.safeGetSession) {
    return { session: null, user: null, profile: null, vendorProfile: null };
  }

  const { session, user } = await locals.safeGetSession();
  if (!user) return { session, user, profile: null, vendorProfile: null };

  const [{ data: profile }, { data: vendorProfile }] = await Promise.all([
    locals.supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    locals.supabase.from('vendor_profiles').select('*').eq('user_id', user.id).maybeSingle()
  ]);

  return { session, user, profile, vendorProfile };
};
