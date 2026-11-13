import { z } from 'zod';
import { parseRupiah, rupiahField } from '@/lib/money';

export const serviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nama layanan wajib diisi.')
      .max(200, 'Nama layanan terlalu panjang, maksimal 200 karakter.'),
    type: z.enum(['consultation', 'procedure', 'other', 'package'], { error: 'Pilih jenis layanan.' }),
    price: rupiahField('Tarif'),
    doctor_fee_type: z.enum(['none', 'fixed', 'percent'], { error: 'Pilih aturan jasa dokter.' }),
    // Rupiah for "fixed", whole percent for "percent", ignored for "none".
    doctor_fee_value: z
      .union([z.string(), z.number()])
      .nullish()
      .transform((value) => (typeof value === 'number' ? String(value) : (value ?? '')).replace(/[^\d]/g, ''))
      .transform((value) => (value === '' ? 0 : Number(value))),
  })
  .transform((service) => (service.doctor_fee_type === 'none' ? { ...service, doctor_fee_value: 0 } : service))
  .refine((s) => s.doctor_fee_type !== 'fixed' || s.doctor_fee_value <= s.price, {
    message: 'Jasa dokter tidak boleh melebihi tarif.',
    path: ['doctor_fee_value'],
  })
  .refine((s) => s.doctor_fee_type !== 'percent' || (s.doctor_fee_value >= 0 && s.doctor_fee_value <= 100), {
    message: 'Persentase jasa dokter harus 0 sampai 100.',
    path: ['doctor_fee_value'],
  });

export type ServiceInput = z.input<typeof serviceSchema>;
export type ServiceValues = z.output<typeof serviceSchema>;

type FeeRule = { price: number; doctor_fee_type: string; doctor_fee_value: number };

/** Doctor fee (integer rupiah) for one unit of a service at its price. Percent rounds down. */
export function doctorFeeAmount(rule: FeeRule) {
  if (rule.doctor_fee_type === 'fixed') return rule.doctor_fee_value;
  if (rule.doctor_fee_type === 'percent') return Math.floor((rule.price * rule.doctor_fee_value) / 100);

  return 0;
}

// Invoices -----------------------------------------------------------------------

export const discountSchema = z
  .object({
    amount: rupiahField('Diskon'),
    reason: z
      .string()
      .nullish()
      .transform((value) => (value ?? '').trim())
      .refine((value) => value.length <= 200, 'Alasan maksimal 200 karakter.'),
  })
  .refine((value) => value.amount === 0 || value.reason !== '', {
    message: 'Alasan diskon wajib diisi.',
    path: ['reason'],
  });

export type DiscountInput = z.input<typeof discountSchema>;
export type DiscountValues = z.output<typeof discountSchema>;

export const invoiceServiceSchema = z.object({
  service_id: z.uuid('Pilih layanan.'),
  qty: z.coerce
    .number<string | number>({ error: 'Jumlah wajib diisi angka.' })
    .int('Jumlah harus bilangan bulat.')
    .min(1, 'Jumlah minimal 1.')
    .max(100, 'Jumlah maksimal 100.'),
});

export type InvoiceServiceInput = z.input<typeof invoiceServiceSchema>;
export type InvoiceServiceValues = z.output<typeof invoiceServiceSchema>;

export const PAYMENT_METHODS = ['cash', 'qris', 'transfer'] as const;

/** Payment form for an invoice total; cash must cover it. */
export function paymentSchema(total: number) {
  return z
    .object({
      method: z.enum(PAYMENT_METHODS, { error: 'Pilih metode pembayaran.' }),
      cash_received: z
        .union([z.string(), z.number()])
        .nullish()
        .transform((value) => (value === null || value === undefined ? '' : String(value)))
        .transform((value) => (value.trim() === '' ? null : parseRupiah(value))),
      reference: z
        .string()
        .nullish()
        .transform((value) => (value ?? '').trim())
        .refine((value) => value.length <= 100, 'Referensi maksimal 100 karakter.')
        .transform((value) => value || null),
    })
    .refine((value) => value.method !== 'cash' || (value.cash_received ?? -1) >= total, {
      message: 'Uang diterima kurang dari total tagihan.',
      path: ['cash_received'],
    })
    .transform((value) => ({ ...value, cash_received: value.method === 'cash' ? value.cash_received : null }));
}

/**
 * Likely cash amounts for a bill: exact, then rounded up to common notes
 * (5k, 10k, 50k, 100k). Up to four, ascending, no duplicates.
 */
export function cashSuggestions(total: number) {
  if (total <= 0) return [];

  const up = (step: number) => Math.ceil(total / step) * step;

  return [...new Set([total, up(5_000), up(10_000), up(50_000), up(100_000)])].sort((a, b) => a - b).slice(0, 4);
}

export type PaymentInput = z.input<ReturnType<typeof paymentSchema>>;
export type PaymentValues = z.output<ReturnType<typeof paymentSchema>>;

export const packageItemsSchema = z.object({
  items: z
    .array(
      z.object({
        service_id: z.uuid('Pilih layanan.'),
        qty: z.coerce
          .number<string | number>({ error: 'Jumlah wajib diisi angka.' })
          .int('Jumlah harus bilangan bulat.')
          .min(1, 'Jumlah minimal 1.')
          .max(100, 'Jumlah maksimal 100.'),
      }),
    )
    .min(1, 'Tambahkan minimal satu layanan ke paket.')
    .max(50, 'Maksimal 50 layanan per paket.')
    .refine(
      (items) => new Set(items.map((item) => item.service_id)).size === items.length,
      'Layanan tidak boleh dobel.',
    ),
});

export type PackageItemsInput = z.input<typeof packageItemsSchema>;
export type PackageItemsValues = z.output<typeof packageItemsSchema>;

export const voidSchema = z.object({
  reason: z.string().trim().min(1, 'Alasan pembatalan wajib diisi.').max(200, 'Alasan maksimal 200 karakter.'),
});

export type VoidValues = z.output<typeof voidSchema>;

const BILLING_ERRORS: Record<string, string> = {
  not_allowed: 'Anda tidak punya akses ke kasir.',
  visit_not_found: 'Kunjungan tidak ditemukan. Muat ulang halaman.',
  not_at_cashier: 'Pasien belum diteruskan ke kasir.',
  invoice_not_found: 'Tagihan tidak ditemukan. Muat ulang halaman.',
  invoice_locked: 'Tagihan sudah dibayar dan terkunci.',
  service_inactive: 'Layanan tidak aktif. Pilih layanan lain.',
  qty_invalid: 'Jumlah harus 1 sampai 100.',
  item_not_removable:
    'Baris ini dari pemeriksaan/farmasi dan tidak bisa dihapus. Beri diskon dengan alasan jika perlu.',
  discount_invalid: 'Diskon melebihi nilai tagihan.',
  discount_reason_required: 'Alasan diskon wajib diisi.',
  payment_method_invalid: 'Pilih metode pembayaran.',
  cash_not_enough: 'Uang diterima kurang dari total tagihan.',
  package_not_found: 'Paket tidak ditemukan. Muat ulang halaman.',
  package_items_invalid: 'Isi paket harus layanan aktif (bukan paket lain).',
  invoice_not_paid: 'Hanya tagihan lunas yang bisa dibatalkan.',
  void_reason_required: 'Alasan pembatalan wajib diisi.',
};

export function billingErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === 'P0001' && error.message && BILLING_ERRORS[error.message]) return BILLING_ERRORS[error.message];
  if (error.code === '23514') return BILLING_ERRORS.discount_invalid;

  return 'Tagihan gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.';
}

/** Bill sections, in the order the patient went through the visit. */
export const INVOICE_GROUPS = [
  { key: 'exam', label: 'Pemeriksaan', types: ['consultation', 'procedure'] },
  { key: 'medicine', label: 'Obat & bahan', types: ['medicine', 'consumable'] },
  { key: 'service', label: 'Layanan tambahan', types: ['service', 'package'] },
] as const;

/** Splits invoice lines into the sections above (unknown types go last), skipping empty sections. */
export function groupInvoiceItems<T extends { item_type: string; amount: number }>(items: readonly T[]) {
  const known = new Set<string>(INVOICE_GROUPS.flatMap((group) => group.types));

  const groups = INVOICE_GROUPS.map((group) => ({
    key: group.key as string,
    label: group.label as string,
    items: items.filter((item) => (group.types as readonly string[]).includes(item.item_type)),
  }));

  const other = items.filter((item) => !known.has(item.item_type));

  if (other.length > 0) groups.push({ key: 'other', label: 'Lainnya', items: other });

  return groups
    .filter((group) => group.items.length > 0)
    .map((group) => ({ ...group, total: group.items.reduce((sum, item) => sum + item.amount, 0) }));
}
