'use server';

import { redirect } from 'next/navigation';
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
      error: parsed.error.issues[0]?.message ?? 'Data login tidak valid.',
    };
  }

  return signInWith(parsed.data);
}

/** Development only: signs in as a seeded test account by email, so testing roles needs no typing. */
export async function signInAsTestAccount(email: string): Promise<ActionResult> {
  const credentials = testAccountCredentials(String(email));

  if (!credentials) return { ok: false, error: 'Login cepat hanya tersedia saat pengembangan.' };

  return signInWith(credentials);
}

async function signInWith(credentials: { email: string; password: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return {
      ok: false,
      error: 'Email atau kata sandi salah. Periksa kembali lalu coba lagi.',
    };
  }

  const { data: profile } = await supabase.from('profiles').select('is_active').eq('id', data.user.id).maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();

    return { ok: false, error: 'Akun Anda tidak aktif. Hubungi admin klinik.' };
  }

  // The client navigates on success: a redirect() thrown inside a mutation would surface as an error.
  return { ok: true, data: undefined };
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

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' };

  return changeOwnPassword(await createClient(), parsed.data);
}
