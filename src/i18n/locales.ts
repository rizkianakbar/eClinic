/** Screen languages. Bahasa Indonesia is the default and the language of every printout and export. */
export const LOCALES = ['id', 'en'] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'id';

/** Remembers the last signed-in person's language on this computer, for the login page. */
export const LOCALE_COOKIE = 'locale';

/** Set by the proxy on /print/* requests: printed documents are always in Bahasa Indonesia (clinic decision). */
export const PRINT_HEADER = 'x-print';

/** BCP 47 tags for Intl: English uses day-month-year order, like Indonesia. */
export const INTL_LOCALE: Record<AppLocale, string> = { id: 'id-ID', en: 'en-GB' };

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
