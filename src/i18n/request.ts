import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import { CLINIC_TIME_ZONE } from '@/lib/dates';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, PRINT_HEADER } from './locales';

/**
 * The language of this request: Bahasa for printouts; otherwise the signed-in person's choice (profiles.locale;
 * the session is already loaded for the page, so this costs nothing), else the last choice on this computer
 * (login page), else Bahasa.
 */
export default getRequestConfig(async () => {
  const [session, cookieStore, headerStore] = await Promise.all([getSession(), cookies(), headers()]);
  const remembered = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale = headerStore.has(PRINT_HEADER)
    ? DEFAULT_LOCALE
    : (session?.locale ?? (isLocale(remembered) ? remembered : DEFAULT_LOCALE));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: CLINIC_TIME_ZONE,
  };
});
