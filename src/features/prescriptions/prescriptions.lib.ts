import { z } from "zod";

/** Common signa, offered as suggestions; any text is allowed. */
export const SIGNA_SUGGESTIONS = [
  "3 x 1 sesudah makan",
  "2 x 1 sesudah makan",
  "1 x 1 sesudah makan",
  "3 x 1 sebelum makan",
  "2 x 1 sebelum makan",
  "1 x 1 malam hari",
  "Bila perlu",
  "Oles tipis 2 x sehari",
] as const;

export const COMPOUND_FORM_LABELS = { puyer: "Puyer", kapsul: "Kapsul" } as const;

const signa = z
  .string()
  .trim()
  .min(1, "Aturan pakai (signa) wajib diisi.")
  .max(200, "Aturan pakai terlalu panjang, maksimal 200 karakter.");

const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number<string | number>({ error: `${label} wajib diisi angka.` })
    .int(`${label} harus bilangan bulat.`)
    .min(min, `${label} minimal ${min}.`)
    .max(max, `${label} maksimal ${max}.`);

export const prescriptionItemSchema = z.object({
  medicine_id: z.uuid("Pilih obat."),
  qty: wholeNumber("Jumlah", 1, 10000),
  signa,
});

const NO_DUPLICATE_INGREDIENTS = "Bahan racikan tidak boleh dobel.";
const hasNoDuplicates = (ids: string[]) => new Set(ids).size === ids.length;

export const compoundSchema = z.object({
  form: z.enum(["puyer", "kapsul"], { error: "Pilih bentuk racikan." }),
  quantity: wholeNumber("Jumlah racikan", 1, 200),
  signa,
  ingredients: z
    .array(z.object({ medicine_id: z.uuid("Pilih obat."), qty: wholeNumber("Jumlah bahan", 1, 10000) }))
    .min(1, "Tambahkan minimal satu bahan racikan.")
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
  .refine((medicine) => medicine !== null, "Pilih obat.");

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
      .array(z.object({ medicine: pickedMedicine, qty: wholeNumber("Jumlah bahan", 1, 10000) }))
      .min(1, "Tambahkan minimal satu bahan racikan.")
      .refine((items) => hasNoDuplicates(items.map((item) => item.medicine?.id ?? "")), NO_DUPLICATE_INGREDIENTS),
  })
  .transform(({ ingredients, ...rest }) => ({
    ...rest,
    ingredients: ingredients.map(({ medicine, qty }) => ({ medicine_id: medicine!.id, qty })),
  }));

export type PrescriptionItemFormInput = z.input<typeof prescriptionItemFormSchema>;
export type CompoundFormInput = z.input<typeof compoundFormSchema>;
