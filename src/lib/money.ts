import { z } from 'zod';

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** Formats integer rupiah, e.g. 150000 -> "Rp 150.000". */
export function formatRupiah(amount: number) {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Rupiah amount must be a safe integer, got ${amount}`);
  }

  return rupiahFormatter.format(amount).replace(/ /g, ' ');
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
export function rupiahField(label: string, options: { max?: number } = {}) {
  const max = options.max ?? 1_000_000_000;

  return z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === 'number' ? value : parseRupiah(value)))
    .refine((value) => value !== null, `${label} wajib diisi dengan angka, contoh: 15000.`)
    .transform((value) => value as number)
    .refine((value) => value >= 0, `${label} tidak boleh negatif.`)
    .refine((value) => value <= max, `${label} terlalu besar.`);
}

const compactFormatter = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

/** Short rupiah for chart axes: 650000 -> "Rp 650 rb", 1250000 -> "Rp 1,3 jt". */
export function formatRupiahCompact(amount: number) {
  return `Rp ${compactFormatter.format(amount).replace(/ /g, ' ')}`;
}
