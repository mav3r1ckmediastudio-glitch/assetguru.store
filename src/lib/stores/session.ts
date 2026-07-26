import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';

export const authSession = writable<Session | null>(null);
export const authUser = writable<User | null>(null);
export const currentProfile = writable<Record<string, any> | null>(null);
export const currentVendorProfile = writable<Record<string, any> | null>(null);

export function hydrateSession(data: {
  session?: Session | null;
  user?: User | null;
  profile?: Record<string, any> | null;
  vendorProfile?: Record<string, any> | null;
}) {
  authSession.set(data.session ?? null);
  authUser.set(data.user ?? null);
  currentProfile.set(data.profile ?? null);
  currentVendorProfile.set(data.vendorProfile ?? null);
}
