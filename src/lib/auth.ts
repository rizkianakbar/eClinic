import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { type AppLocale, DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import type { Database } from './supabase/database.types';
import { createClient } from './supabase/server';
import { type HostTenant, tenantFromHost } from './tenant';

export type Role = Database['public']['Enums']['user_role'];

/** A branch this person may work at. */
export type Branch = { id: string; name: string; address: string | null };

/** Who is signed in, at which organization: everything that does not depend on the branch. */
export type Account = {
  userId: string;
  role: Role;
  fullName: string;
  /** Screen language (profiles.locale). */
  locale: AppLocale;
  organizationName: string;
  /** The organization's subdomain: `<slug>.<root domain>`. */
  organizationSlug: string;
  /** The branches this person may work at (owners: all of them). */
  branches: Branch[];
  /** More than one open branch in the organization: screens name the branch so nobody works at the wrong one. */
  multiBranch: boolean;
};

/** A signed-in staff member working at a branch: every query is scoped to `clinicId` (the active branch). */
export type Session = Account & {
  /** The active branch (clinics.id). Queue, stock, cashier, master data and reports belong to it. */
  clinicId: string;
  /** The active branch's name. */
  clinicName: string;
  /** Branch setting: sign out after this many idle minutes (shared PCs). */
  idleLogoutMinutes: number;
};

export type SessionState =
  | { kind: 'signed-out' }
  /** Signed in, but no branch chosen yet (several branches, or the chosen one was closed or unassigned). */
  | { kind: 'needs-branch'; account: Account }
  | { kind: 'ready'; session: Session };

/** The organization (or the marketing site) this request's host serves. Cached per request. */
export const getHostTenant = cache(async (): Promise<HostTenant> => {
  const store = await headers();

  return tenantFromHost(store.get('x-forwarded-host') ?? store.get('host'));
});

/**
 * Who is signed in on this host, and at which branch. Cached per request. Sessions are per host (cookies are
 * not shared across subdomains), and the account must belong to the organization this host serves.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const tenant = await getHostTenant();

  if (tenant.kind !== 'clinic') return { kind: 'signed-out' };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;

  if (!userId) return { kind: 'signed-out' };

  const [{ data: profile }, { data: branches }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'active_clinic_id, role, full_name, is_active, locale, organization:organizations(name, slug), clinic:clinics!profiles_active_clinic_id_fkey(name, idle_logout_minutes)',
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase.rpc('my_clinics'),
  ]);

  if (!profile?.is_active || !profile.organization || profile.organization.slug !== tenant.slug) {
    return { kind: 'signed-out' };
  }

  const account: Account = {
    userId,
    role: profile.role,
    fullName: profile.full_name,
    locale: isLocale(profile.locale) ? profile.locale : DEFAULT_LOCALE,
    organizationName: profile.organization.name,
    organizationSlug: profile.organization.slug,
    branches: (branches ?? []).map((branch) => ({ id: branch.id, name: branch.name, address: branch.address })),
    multiBranch: (branches?.[0]?.organization_branches ?? 1) > 1,
  };

  // The clinics row is readable only while it is a valid active branch (RLS: auth_clinic_id()).
  const active = account.branches.find((branch) => branch.id === profile.active_clinic_id);

  if (!active || !profile.clinic) return { kind: 'needs-branch', account };

  return {
    kind: 'ready',
    session: {
      ...account,
      clinicId: active.id,
      clinicName: profile.clinic.name,
      idleLogoutMinutes: profile.clinic.idle_logout_minutes,
    },
  };
});

/** The signed-in staff member working at a branch of this host's organization, or null. */
export async function getSession(): Promise<Session | null> {
  const state = await getSessionState();

  return state.kind === 'ready' ? state.session : null;
}

/**
 * Use in every page, Server Action and Route Handler. Signed in without a branch: the branch picker. Otherwise
 * without a session (signed out, deactivated, or another organization's account) it goes through /auth/signout,
 * which clears any stale cookie before the login page: going straight to /login would bounce back here while the
 * cookie still looks signed in. A role that is not allowed goes to the dashboard.
 */
export async function requireRole(...roles: Role[]) {
  const state = await getSessionState();

  // No branch chosen: staff pick one; the owner starts from the company overview.
  if (state.kind === 'needs-branch') redirect(state.account.role === 'owner' ? '/company' : '/branch');
  if (state.kind !== 'ready') redirect('/auth/signout');

  const { session } = state;

  if (roles.length > 0 && !roles.includes(session.role)) redirect('/dashboard');

  return session;
}

/** For the branch picker: signed in at this organization, with the branch already active (if any). */
export async function requireAccount(): Promise<{ account: Account; currentId: string | null }> {
  const state = await getSessionState();

  if (state.kind === 'signed-out') redirect('/auth/signout');

  return state.kind === 'ready'
    ? { account: state.session, currentId: state.session.clinicId }
    : { account: state.account, currentId: null };
}

/**
 * The company pages (owner only): they sit above the branches, so the owner needs no active branch. Anyone else
 * goes to their branch's Beranda (or the picker).
 */
export async function requireCompanyOwner(): Promise<{ account: Account; currentId: string | null }> {
  const scope = await requireAccount();

  if (scope.account.role !== 'owner') redirect('/dashboard');

  return scope;
}
