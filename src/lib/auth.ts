import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Database } from './supabase/database.types';
import { createClient } from './supabase/server';

export type Role = Database['public']['Enums']['user_role'];

export type Session = {
  userId: string;
  clinicId: string;
  role: Role;
  fullName: string;
  /** Clinic setting: sign out after this many idle minutes (shared PCs). */
  idleLogoutMinutes: number;
  clinicName: string;
};

/** The signed-in, active staff member, or null. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;

  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id, role, full_name, is_active, clinic:clinics(name, idle_logout_minutes)')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.is_active) return null;

  return {
    userId,
    clinicId: profile.clinic_id,
    role: profile.role,
    fullName: profile.full_name,
    idleLogoutMinutes: profile.clinic?.idle_logout_minutes ?? 15,
    clinicName: profile.clinic?.name ?? 'e-clinic',
  };
});

/** Use in every page, Server Action and Route Handler. Redirects to login if signed out, to the dashboard if the role is not allowed. */
export async function requireRole(...roles: Role[]) {
  const session = await getSession();

  if (!session) redirect('/login');
  if (roles.length > 0 && !roles.includes(session.role)) redirect('/dashboard');

  return session;
}
