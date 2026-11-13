'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, LOCALE_COOKIE } from '@/i18n/locales';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { changePasswordSchema, type SignInInput, signInSchema } from './auth.lib';
import { changeOwnPassword, testAccountCredentials } from './auth.service';

export async function signIn(input: SignInInput): Promise<ActionResult> {
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
export async function signInAsTestAccount(email: string): Promise<ActionResult> {
  const credentials = testAccountCredentials(String(email));

  if (!credentials) return { ok: false, error: 'auth.errors.devOnly' };

  return signInWith(credentials);
}

async function signInWith(credentials: { email: string; password: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return {
      ok: false,
      error: 'auth.errors.wrongCredentials',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, locale')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();

    return { ok: false, error: 'auth.errors.inactive' };
  }

  // This computer's login page greets the next person in the language of the last one.
  await rememberLocale(profile.locale);

  // The client navigates on success: a redirect() thrown inside a mutation would surface as an error.
  return { ok: true, data: undefined };
}

/** The signed-in person switches the screen language (Akun saya). Printouts stay in Bahasa. */
export async function setLocaleAction(locale: string): Promise<ActionResult> {
  await requireRole();

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
  await requireRole();

  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return changeOwnPassword(await createClient(), parsed.data);
}
