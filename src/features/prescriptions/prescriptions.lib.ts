import { z } from 'zod';
import { keyed } from '@/i18n/keyed';

/** Common signa, offered as suggestions; any text is allowed. Indonesian on purpose: it prints on the drug label. */
export const SIGNA_SUGGESTIONS = [
  '3 x 1 sesudah makan',
  '2 x 1 sesudah makan',
  '1 x 1 sesudah makan',
  '3 x 1 sebelum makan',
  '2 x 1 sebelum makan',
  '1 x 1 malam hari',
  'Bila perlu',
  'Oles tipis 2 x sehari',
] as const;

/** Compound forms; screens name them with messages compoundForm.<form>, labels print these. */
export const COMPOUND_FORM_LABELS = { puyer: 'Puyer', kapsul: 'Kapsul' } as const;

const signa = z.string().trim().min(1, 'rx.errors.signaRequired').max(200, 'rx.errors.signaTooLong');

const wholeNumber = (min: number, max: number) =>
  z.coerce
    .number<string | number>({ error: 'rx.errors.number' })
    .int('rx.errors.integer')
    .min(min, keyed('rx.errors.min', { min }))
    .max(max, keyed('rx.errors.max', { max }));

export const prescriptionItemSchema = z.object({
  medicine_id: z.uuid('rx.errors.pickMedicine'),
  qty: wholeNumber(1, 10000),
  signa,
});

const NO_DUPLICATE_INGREDIENTS = 'rx.errors.duplicateIngredients';
const hasNoDuplicates = (ids: string[]) => new Set(ids).size === ids.length;

export const compoundSchema = z.object({
  form: z.enum(['puyer', 'kapsul'], { error: 'rx.errors.pickForm' }),
  quantity: wholeNumber(1, 200),
  signa,
  ingredients: z
    .array(z.object({ medicine_id: z.uuid('rx.errors.pickMedicine'), qty: wholeNumber(1, 10000) }))
    .min(1, 'rx.errors.oneIngredient')
    .refine((items) => hasNoDuplicates(items.map((item) => item.medicine_id)), NO_DUPLICATE_INGREDIENTS),
});

export type PrescriptionItemInput = z.input<typeof prescriptionItemSchema>;
export type PrescriptionItemValues = z.output<typeof prescriptionItemSchema>;
export type CompoundInput = z.input<typeof compoundSchema>;
export type CompoundValues = z.output<typeof compoundSchema>;

// Form schemas: the picker keeps the whole medicine (to show its name); the
// output is exactly what the server schemas above accept.

const pickedMedicine = z
  .object({ id: z.uuid(), name: z.string(), unit: z.string() })
  .nullable()
  .refine((medicine) => medicine !== null, 'rx.errors.pickMedicine');

export const prescriptionItemFormSchema = z
  .object({
    medicine: pickedMedicine,
    qty: prescriptionItemSchema.shape.qty,
    signa,
  })
  .transform(({ medicine, ...rest }) => ({ ...rest, medicine_id: medicine!.id }));

export const compoundFormSchema = z
  .object({
    form: compoundSchema.shape.form,
    quantity: compoundSchema.shape.quantity,
    signa,
    ingredients: z
      .array(z.object({ medicine: pickedMedicine, qty: wholeNumber(1, 10000) }))
      .min(1, 'rx.errors.oneIngredient')
      .refine((items) => hasNoDuplicates(items.map((item) => item.medicine?.id ?? '')), NO_DUPLICATE_INGREDIENTS),
  })
  .transform(({ ingredients, ...rest }) => ({
    ...rest,
    ingredients: ingredients.map(({ medicine, qty }) => ({ medicine_id: medicine!.id, qty })),
  }));

export type PrescriptionItemFormInput = z.input<typeof prescriptionItemFormSchema>;
export type CompoundFormInput = z.input<typeof compoundFormSchema>;

/** Quick reasons for a visit without medicine (rx.noMedicine.reasons.<key>); the doctor can also type their own. */
export const NO_MEDICINE_REASONS = ['education', 'followUp', 'ownMedicine', 'procedureOnly'] as const;

/** "Tidak perlu obat": why the doctor prescribed nothing (stored on the visit, checked when signing). */
export const noMedicineSchema = z.object({
  reason: z.string().trim().min(3, 'rx.errors.reasonMin').max(200, 'rx.errors.reasonMax'),
});

export type NoMedicineInput = z.input<typeof noMedicineSchema>;
export type NoMedicineValues = z.output<typeof noMedicineSchema>;
