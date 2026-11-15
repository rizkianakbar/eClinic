'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, LOCALE_COOKIE } from '@/i18n/locales';
import { getHostTenant, requireAccount } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';

/** Where the browser goes after signing in: the dashboard, or the branch picker. */
type SignInResult = { next: '/dashboard' | '/branch' | '/company' };

import { startBranchSession } from '@/features/branches/branches.service';
import { createClient } from '@/lib/supabase/server';
import { clinicHost } from '@/lib/tenant';
import { changePasswordSchema, type SignInInput, signInSchema } from './auth.lib';
import { changeOwnPassword, testAccountCredentials } from './auth.service';

export async function signIn(input: SignInInput): Promise<ActionResult<SignInResult>> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'errors.invalid',
    };
  }

  return signInWith(parsed.data);
}

/** Development only: signs in as a seeded test account by email, so testing roles needs no typing. */
export async function signInAsTestAccount(email: string): Promise<ActionResult<SignInResult>> {
  const tenant = await getHostTenant();
  const credentials = tenant.kind === 'clinic' ? testAccountCredentials(String(email), tenant.slug) : null;

  if (!credentials) return { ok: false, error: 'auth.errors.devOnly' };

  return signInWith(credentials);
}

async function signInWith(credentials: { email: string; password: string }): Promise<ActionResult<SignInResult>> {
  const [supabase, tenant] = await Promise.all([createClient(), getHostTenant()]);
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return {
      ok: false,
      error: 'auth.errors.wrongCredentials',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, locale, organization:organizations(slug)')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut({ scope: 'local' });

    return { ok: false, error: 'auth.errors.inactive' };
  }

  // Each clinic signs in on its own address; an account never opens another clinic's.
  if (tenant.kind !== 'clinic' || profile.organization?.slug !== tenant.slug) {
    await supabase.auth.signOut({ scope: 'local' });

    return {
      ok: false,
      error: 'auth.errors.otherClinic',
      values: { address: profile.organization ? clinicHost(profile.organization.slug) : '' },
    };
  }

  // One branch: work there. Several: the picker asks every time (the owner starts at the company overview).
  const next = await startBranchSession(supabase, data.user.id);

  // This computer's login page greets the next person in the language of the last one.
  await rememberLocale(profile.locale);

  // The client navigates on success: a redirect() thrown inside a mutation would surface as an error.
  return { ok: true, data: { next } };
}

/** The signed-in person switches the screen language (Akun saya). Printouts stay in Bahasa. */
export async function setLocaleAction(locale: string): Promise<ActionResult> {
  await requireAccount();

  if (!isLocale(locale)) return { ok: false, error: 'errors.invalid' };

  const { error } = await (await createClient()).rpc('set_my_locale', { p_locale: locale });

  if (error) return { ok: false, error: 'errors.generic' };

  await rememberLocale(locale);

  return { ok: true, data: undefined };
}

async function rememberLocale(locale: string) {
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  return { ok: true, data: undefined };
}

/** Automatic sign-out after the clinic's idle timeout. */
export async function signOutIdle() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  redirect('/login?reason=idle');
}

/** Any signed-in staff member changes their own password. */
export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  await requireAccount();

  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return changeOwnPassword(await createClient(), parsed.data);
}
