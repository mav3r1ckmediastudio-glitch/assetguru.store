import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { adminOwnerConfigured, verifyAdminOwner } from '$lib/server/admin-owner';
import { getSupabaseAdmin, writeAudit } from '$lib/server/supabase';

const clean = (value: FormDataEntryValue | null) => String(value ?? '').trim();

async function promoteOwner(user: { id: string; email?: string | null }, displayName: string, request: Request) {
  const admin = getSupabaseAdmin();
  const email = user.email ?? '';
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    role: 'admin',
    display_name: displayName || 'AssetGuru Owner',
    email
  }, { onConflict: 'id' });
  if (error) throw error;
  await writeAudit({
    actorId: user.id,
    actorRole: 'admin',
    action: 'admin.owner_authenticated',
    entityType: 'profile',
    entityId: user.id,
    metadata: { dedicated_admin_access: true },
    request
  });
}

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (user) {
    const { data: profile } = await locals.supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role === 'admin') redirect(303, '/admin');
  }
  return { configured: adminOwnerConfigured() };
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const form = await request.formData();
    const email = clean(form.get('email')).toLowerCase();
    const password = String(form.get('password') ?? '');
    const accessCode = String(form.get('accessCode') ?? '');

    if (!adminOwnerConfigured()) return fail(503, { mode: 'login', message: 'Owner access has not been configured in Netlify yet.', email });
    if (!verifyAdminOwner(email, accessCode)) return fail(403, { mode: 'login', message: 'The owner email or private access code is incorrect.', email });
    if (!password) return fail(400, { mode: 'login', message: 'Enter the admin account password.', email });

    const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return fail(400, { mode: 'login', message: error?.message ?? 'Admin sign-in failed.', email });

    try {
      await promoteOwner(data.user, String(data.user.user_metadata?.display_name ?? 'AssetGuru Owner'), request);
    } catch (error) {
      await locals.supabase.auth.signOut();
      return fail(500, { mode: 'login', message: error instanceof Error ? error.message : 'The admin role could not be activated.', email });
    }

    redirect(303, '/admin');
  },

  create: async ({ request, locals }) => {
    const form = await request.formData();
    const displayName = clean(form.get('displayName')) || 'AssetGuru Owner';
    const email = clean(form.get('email')).toLowerCase();
    const password = String(form.get('password') ?? '');
    const accessCode = String(form.get('accessCode') ?? '');

    if (!adminOwnerConfigured()) return fail(503, { mode: 'create', message: 'Owner access has not been configured in Netlify yet.', displayName, email });
    if (!verifyAdminOwner(email, accessCode)) return fail(403, { mode: 'create', message: 'The owner email or private access code is incorrect.', displayName, email });
    if (displayName.length < 2 || password.length < 12) return fail(400, { mode: 'create', message: 'Use a name and an admin password of at least 12 characters.', displayName, email });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role: 'buyer' }
    });
    if (error || !data.user) {
      const message = /already|registered|exists/i.test(error?.message ?? '')
        ? 'An account already exists for this email. Use Admin sign in instead.'
        : error?.message ?? 'The admin account could not be created.';
      return fail(400, { mode: 'create', message, displayName, email });
    }

    try {
      await promoteOwner(data.user, displayName, request);
      const { error: signInError } = await locals.supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (error) {
      return fail(500, { mode: 'create', message: error instanceof Error ? error.message : 'The owner account was created but could not be signed in.', displayName, email });
    }

    redirect(303, '/admin');
  }
};
