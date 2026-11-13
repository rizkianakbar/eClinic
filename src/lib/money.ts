import { z } from 'zod';
import { type AppLocale, INTL_LOCALE } from '@/i18n/locales';

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/**
 * Formats integer rupiah, e.g. 150000 -> "Rp 150.000". The space after "Rp" is non-breaking, so an
 * amount never splits across two lines in a narrow column (phones).
 */
export function formatRupiah(amount: number) {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Rupiah amount must be a safe integer, got ${amount}`);
  }

  return rupiahFormatter.format(amount).replace(/\s/g, '\u00a0');
}

/** Parses user input like "Rp 150.000" or "150000" into integer rupiah. Returns null when empty or invalid. */
export function parseRupiah(input: string) {
  const digits = input.replace(/[^\d-]/g, '');

  if (!/^-?\d+$/.test(digits)) return null;

  const amount = Number(digits);

  return Number.isSafeInteger(amount) ? amount : null;
}

/**
 * Zod field for a rupiah input: accepts "Rp 15.000", "15000" or an already-parsed
 * number (so actions can re-validate parsed form values); outputs integer rupiah.
 */
export function rupiahField(options: { max?: number } = {}) {
  const max = options.max ?? 1_000_000_000;

  return z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === 'number' ? value : parseRupiah(value)))
    .refine((value) => value !== null, 'validation.amountNumber')
    .transform((value) => value as number)
    .refine((value) => value >= 0, 'validation.amountNegative')
    .refine((value) => value <= max, 'validation.amountTooLarge');
}

const compactFormatters = new Map<AppLocale, Intl.NumberFormat>();

/** Short rupiah for chart axes: 650000 -> "Rp 650 rb", 1250000 -> "Rp 1,3 jt" (en: "Rp 650K", "Rp 1.3M"). */
export function formatRupiahCompact(amount: number, locale: AppLocale = 'id') {
  let formatter = compactFormatters.get(locale);

  if (!formatter) {
    // en-US, not en-GB: "1.3M" rather than "1.3m".
    formatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : INTL_LOCALE[locale], {
      notation: 'compact',
      maximumFractionDigits: 1,
    });

    compactFormatters.set(locale, formatter);
  }

  return `Rp\u00a0${formatter.format(amount).replace(/\s/g, '\u00a0')}`;
}
