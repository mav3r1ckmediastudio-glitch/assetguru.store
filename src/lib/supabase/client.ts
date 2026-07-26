import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

let client: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!client) {
    if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Supabase public environment variables are not configured.');
    }
    client = createBrowserClient<Database>(
      env.PUBLIC_SUPABASE_URL,
      env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  }
  return client;
}
