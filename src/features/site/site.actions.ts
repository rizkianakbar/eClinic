'use server';

import { cookies } from 'next/headers';
import { isLocale, LOCALE_COOKIE } from '@/i18n/locales';
import type { ActionResult } from '@/lib/query';

/** A visitor of the marketing site picks the language (no account yet: remembered in a cookie). */
export async function setSiteLocaleAction(locale: string): Promise<ActionResult> {
  if (!isLocale(locale)) return { ok: false, error: 'errors.invalid' };

  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });

  return { ok: true, data: undefined };
}
