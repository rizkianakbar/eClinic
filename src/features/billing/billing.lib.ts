import { z } from 'zod';
import { keyed } from '@/i18n/keyed';
import { parseRupiah, rupiahField } from '@/lib/money';

export const serviceSchema = z
  .object({
    name: z.string().trim().min(1, 'billing.errors.nameRequired').max(200, 'billing.errors.nameTooLong'),
    type: z.enum(['consultation', 'procedure', 'other', 'package'], { error: 'billing.errors.pickType' }),
    price: rupiahField(),
    doctor_fee_type: z.enum(['none', 'fixed', 'percent'], { error: 'billing.errors.pickFeeType' }),
    // Rupiah for "fixed", whole percent for "percent", ignored for "none".
    doctor_fee_value: z
      .union([z.string(), z.number()])
      .nullish()
      .transform((value) => (typeof value === 'number' ? String(value) : (value ?? '')).replace(/[^\d]/g, ''))
      .transform((value) => (value === '' ? 0 : Number(value))),
  })
  .transform((service) => (service.doctor_fee_type === 'none' ? { ...service, doctor_fee_value: 0 } : service))
  .refine((s) => s.doctor_fee_type !== 'fixed' || s.doctor_fee_value <= s.price, {
    message: 'billing.errors.feeOverPrice',
    path: ['doctor_fee_value'],
  })
  .refine((s) => s.doctor_fee_type !== 'percent' || (s.doctor_fee_value >= 0 && s.doctor_fee_value <= 100), {
    message: 'billing.errors.feePercent',
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
    amount: rupiahField(),
    reason: z
      .string()
      .nullish()
      .transform((value) => (value ?? '').trim())
      .refine((value) => value.length <= 200, 'billing.errors.reasonMax'),
  })
  .refine((value) => value.amount === 0 || value.reason !== '', {
    message: 'billing.errors.discountReasonRequired',
    path: ['reason'],
  });

export type DiscountInput = z.input<typeof discountSchema>;
export type DiscountValues = z.output<typeof discountSchema>;

const serviceQty = z.coerce
  .number<string | number>({ error: 'billing.errors.qtyNumber' })
  .int('billing.errors.qtyInteger')
  .min(1, keyed('billing.errors.qtyMin', { min: 1 }))
  .max(100, keyed('billing.errors.qtyMax', { max: 100 }));

export const invoiceServiceSchema = z.object({
  service_id: z.uuid('billing.errors.pickService'),
  qty: serviceQty,
});

export type InvoiceServiceInput = z.input<typeof invoiceServiceSchema>;
export type InvoiceServiceValues = z.output<typeof invoiceServiceSchema>;

export const PAYMENT_METHODS = ['cash', 'qris', 'transfer'] as const;

/** Payment form for an invoice total; cash must cover it. */
export function paymentSchema(total: number) {
  return z
    .object({
      method: z.enum(PAYMENT_METHODS, { error: 'billing.errors.pickMethod' }),
      cash_received: z
        .union([z.string(), z.number()])
        .nullish()
        .transform((value) => (value === null || value === undefined ? '' : String(value)))
        .transform((value) => (value.trim() === '' ? null : parseRupiah(value))),
      reference: z
        .string()
        .nullish()
        .transform((value) => (value ?? '').trim())
        .refine((value) => value.length <= 100, 'billing.errors.referenceMax')
        .transform((value) => value || null),
    })
    .refine((value) => value.method !== 'cash' || (value.cash_received ?? -1) >= total, {
      message: 'billing.errors.cashNotEnough',
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
    .array(z.object({ service_id: z.uuid('billing.errors.pickService'), qty: serviceQty }))
    .min(1, 'billing.errors.packageEmpty')
    .max(50, 'billing.errors.packageTooMany')
    .refine(
      (items) => new Set(items.map((item) => item.service_id)).size === items.length,
      'billing.errors.packageDuplicate',
    ),
});

export type PackageItemsInput = z.input<typeof packageItemsSchema>;
export type PackageItemsValues = z.output<typeof packageItemsSchema>;

export const voidSchema = z.object({
  reason: z.string().trim().min(1, 'billing.errors.voidReasonRequired').max(200, 'billing.errors.reasonMax'),
});

export type VoidValues = z.output<typeof voidSchema>;

/** Database error code -> message key. */
const BILLING_ERRORS: Record<string, string> = {
  not_allowed: 'billing.errors.notAllowed',
  visit_not_found: 'billing.errors.visitNotFound',
  not_at_cashier: 'billing.errors.notAtCashier',
  invoice_not_found: 'billing.errors.invoiceNotFound',
  invoice_locked: 'billing.errors.invoiceLocked',
  service_inactive: 'billing.errors.serviceInactive',
  qty_invalid: 'billing.errors.qtyInvalid',
  item_not_removable: 'billing.errors.itemNotRemovable',
  discount_invalid: 'billing.errors.discountInvalid',
  discount_reason_required: 'billing.errors.discountReasonRequired',
  payment_method_invalid: 'billing.errors.pickMethod',
  cash_not_enough: 'billing.errors.cashNotEnough',
  package_not_found: 'billing.errors.packageNotFound',
  package_items_invalid: 'billing.errors.packageItemsInvalid',
  invoice_not_paid: 'billing.errors.invoiceNotPaid',
  void_reason_required: 'billing.errors.voidReasonRequired',
};

/** Maps a billing write error to a message key. */
export function billingErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === 'P0001' && error.message && BILLING_ERRORS[error.message]) return BILLING_ERRORS[error.message];
  if (error.code === '23514') return BILLING_ERRORS.discount_invalid;

  return 'billing.errors.saveFailed';
}

/** Bill sections, in the order the patient went through the visit. */
export const INVOICE_GROUPS = [
  { key: 'exam', types: ['consultation', 'procedure'] },
  { key: 'medicine', types: ['medicine', 'consumable'] },
  { key: 'service', types: ['service', 'package'] },
] as const;

/** Splits invoice lines into the sections above (unknown types go last), skipping empty sections. */
export type InvoiceGroupKey = (typeof INVOICE_GROUPS)[number]['key'] | 'other';
export type InvoiceItemType = (typeof INVOICE_GROUPS)[number]['types'][number];

export function groupInvoiceItems<T extends { item_type: string; amount: number }>(items: readonly T[]) {
  const known = new Set<string>(INVOICE_GROUPS.flatMap((group) => group.types));

  const groups = INVOICE_GROUPS.map((group) => ({
    key: group.key as InvoiceGroupKey,
    items: items.filter((item) => (group.types as readonly string[]).includes(item.item_type)),
  }));

  const other = items.filter((item) => !known.has(item.item_type));

  if (other.length > 0) groups.push({ key: 'other', items: other });

  return groups
    .filter((group) => group.items.length > 0)
    .map((group) => ({ ...group, total: group.items.reduce((sum, item) => sum + item.amount, 0) }));
}
