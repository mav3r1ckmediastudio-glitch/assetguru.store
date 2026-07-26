import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { Database } from '$lib/types/database';

let adminClient: SupabaseClient<Database> | undefined;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!adminClient) {
    if (!publicEnv.PUBLIC_SUPABASE_URL || !privateEnv.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase server environment variables are not configured.');
    }
    adminClient = createClient<Database>(
      publicEnv.PUBLIC_SUPABASE_URL,
      privateEnv.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return adminClient;
}

export async function requireUser(locals: App.Locals) {
  const { user } = await locals.safeGetSession();
  if (!user) throw new Error('AUTH_REQUIRED');
  return user;
}

export async function requireRole(locals: App.Locals, roles: Array<'buyer' | 'vendor' | 'admin'>) {
  const user = await requireUser(locals);
  const { data, error } = await locals.supabase
    .from('profiles')
    .select('id, role, display_name, email')
    .eq('id', user.id)
    .single();
  if (error || !data || !roles.includes(data.role as 'buyer' | 'vendor' | 'admin')) {
    throw new Error('FORBIDDEN');
  }
  return { user, profile: data };
}

export async function writeAudit(input: {
  actorId?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
}) {
  const admin = getSupabaseAdmin();
  const forwarded = input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const { error } = await admin.from('audit_log').insert({
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip_address: forwarded ?? null,
    user_agent: input.request?.headers.get('user-agent') ?? null
  });
  if (error) throw error;
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  if (message === 'AUTH_REQUIRED') return { status: 401, message: 'Please sign in to continue.' };
  if (message === 'FORBIDDEN') return { status: 403, message: 'You do not have permission to perform this action.' };
  return { status: 500, message: 'The request could not be completed.' };
}
