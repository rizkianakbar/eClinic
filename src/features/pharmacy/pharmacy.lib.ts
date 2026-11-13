import { z } from 'zod';

export const dispenseSchema = z
  .object({
    items: z.array(
      z.object({
        prescription_item_id: z.uuid(),
        not_given: z.boolean(),
        reason: z.string().trim().max(200, 'Alasan maksimal 200 karakter.'),
      }),
    ),
  })
  .superRefine((value, context) => {
    value.items.forEach((item, index) => {
      if (item.not_given && item.reason === '') {
        context.addIssue({
          code: 'custom',
          message: 'Isi alasan obat tidak diberikan.',
          path: ['items', index, 'reason'],
        });
      }
    });
  })
  .transform((value) => ({
    not_given: value.items
      .filter((item) => item.not_given)
      .map((item) => ({ prescription_item_id: item.prescription_item_id, reason: item.reason })),
  }));

export type DispenseInput = z.input<typeof dispenseSchema>;
export type DispenseValues = z.output<typeof dispenseSchema>;

/** What the action receives (the form's output), re-validated on the server. */
export const dispensePayloadSchema = z.object({
  not_given: z.array(
    z.object({
      prescription_item_id: z.uuid(),
      reason: z.string().trim().min(1, 'Isi alasan obat tidak diberikan.').max(200, 'Alasan maksimal 200 karakter.'),
    }),
  ),
});

export const DEFAULT_SHORT_REASON = 'Stok tidak cukup';

type PlannedItem = { id: string; medicineId: string; qty: number };

/**
 * Walks the items in prescription order, taking from each medicine's available
 * (unexpired) stock, and returns the ids of items that cannot be covered, the
 * same order the database dispenses in. Used to pre-tick "not given".
 */
export function shortItems(items: readonly PlannedItem[], available: ReadonlyMap<string, number>) {
  const left = new Map(available);
  const short = new Set<string>();

  for (const item of items) {
    const stock = left.get(item.medicineId) ?? 0;

    if (stock >= item.qty) left.set(item.medicineId, stock - item.qty);
    else short.add(item.id);
  }

  return short;
}

const PHARMACY_ERRORS: Record<string, (detail?: string) => string> = {
  insufficient_stock: (detail) =>
    `Stok ${detail ?? 'obat'} tidak cukup. Tandai "tidak diberikan" dengan alasan, atau catat pembelian dulu.`,
  not_given_reason_required: (detail) => `Isi alasan ${detail ?? 'obat'} tidak diberikan.`,
  not_at_pharmacy: () => 'Resep ini sudah diserahkan atau pasien tidak di farmasi. Muat ulang halaman.',
  not_allowed: () => 'Hanya apoteker yang bisa menyerahkan obat.',
};

export function pharmacyErrorMessage(error: { code?: string; message?: string; details?: string }) {
  const message = error.code === 'P0001' && error.message ? PHARMACY_ERRORS[error.message] : undefined;

  if (message) return message(error.details || undefined);

  return 'Penyerahan obat gagal; stok tidak berubah. Coba lagi, atau hubungi admin jika terus terjadi.';
}

/** Label lines for the drug labels: one per regular item, one per racikan. */
/** `id` is the prescription item (or racikan) the label is for. */
export type DrugLabel = { id: string; title: string; amount: string; signa: string };

type LabelSource = {
  items: { id: string; qty: number; signa: string | null; medicine: { name: string; unit: string } | null }[];
  compounds: { id: string; form: string; quantity: number; signa: string; ingredients: { id: string }[] }[];
};

/** Labels for what was actually given: each given regular item, and each racikan with a given ingredient. */
export function buildDrugLabels(prescription: LabelSource, givenItemIds: ReadonlySet<string>): DrugLabel[] {
  const regular = prescription.items
    .filter((item) => givenItemIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.medicine?.name ?? '',
      amount: `${item.qty} ${item.medicine?.unit ?? ''}`.trim(),
      signa: item.signa ?? '',
    }));

  const compounds = prescription.compounds
    .filter((compound) => compound.ingredients.some((ingredient) => givenItemIds.has(ingredient.id)))
    .map((compound) => ({
      id: compound.id,
      title: `Racikan ${compound.form}`,
      amount: `${compound.quantity} ${compound.form}`,
      signa: compound.signa,
    }));

  return [...regular, ...compounds];
}

type PrescriptionItem = {
  id: string;
  qty: number;
  signa: string | null;
  created_at: string;
  medicine: { id: string; name: string; unit: string; price?: number } | null;
};

/** A usable batch (unexpired, in stock). */
export type StockBatch = {
  id: string;
  medicine_id: string;
  batch_no: string;
  expiry_date: string;
  qty_on_hand: number;
  created_at: string;
};

export type BatchPick = { batchNo: string; expiry: string; qty: number };

/**
 * Which batches each item will be taken from: earliest expiry first, items in
 * the database's dispensing order, ties by batch age: the same walk `dispense_prescription` does.
 * An item the stock cannot cover gets no picks (it is shown as short).
 */
export function planFefo(
  items: readonly { id: string; medicineId: string; qty: number }[],
  batches: readonly StockBatch[],
) {
  const left = new Map<string, StockBatch[]>();

  for (const batch of [...batches].sort(
    (a, b) =>
      a.expiry_date.localeCompare(b.expiry_date) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  )) {
    left.set(batch.medicine_id, [...(left.get(batch.medicine_id) ?? []), { ...batch }]);
  }

  const plan = new Map<string, BatchPick[]>();

  for (const item of items) {
    const queue = left.get(item.medicineId) ?? [];
    const total = queue.reduce((sum, batch) => sum + batch.qty_on_hand, 0);

    if (total < item.qty) {
      plan.set(item.id, []);
      continue;
    }

    const picks: BatchPick[] = [];
    let need = item.qty;

    for (const batch of queue) {
      if (need === 0) break;

      const take = Math.min(need, batch.qty_on_hand);

      if (take === 0) continue;

      batch.qty_on_hand -= take;
      need -= take;
      picks.push({ batchNo: batch.batch_no, expiry: batch.expiry_date, qty: take });
    }

    plan.set(item.id, picks);
  }

  return plan;
}

type PrescriptionForLines = {
  items: PrescriptionItem[];
  compounds: { id: string; form: string; quantity: number; signa: string; ingredients: PrescriptionItem[] }[];
};

/**
 * Display lines (regular items, then each racikan's ingredients) with stock and a
 * shortage flag. Shortage is computed in the database's dispensing order
 * (created_at, id), so the pre-ticks match what the dispense would do.
 */
export function toDispenseLines(
  prescription: PrescriptionForLines,
  available: ReadonlyMap<string, number>,
  batches: readonly StockBatch[] = [],
) {
  const all = [...prescription.items, ...prescription.compounds.flatMap((compound) => compound.ingredients)];
  const dbOrder = [...all].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const planned = dbOrder.map((item) => ({ id: item.id, medicineId: item.medicine?.id ?? '', qty: item.qty }));
  const short = shortItems(planned, available);
  const plan = planFefo(planned, batches);

  const line = (item: PrescriptionItem, group: string | null) => ({
    id: item.id,
    group,
    name: item.medicine?.name ?? '',
    qty: item.qty,
    unit: item.medicine?.unit ?? '',
    signa: item.signa,
    available: available.get(item.medicine?.id ?? '') ?? 0,
    short: short.has(item.id),
    price: item.medicine?.price ?? 0,
    picks: plan.get(item.id) ?? [],
  });

  return [
    ...prescription.items.map((item) => line(item, null)),
    ...prescription.compounds.flatMap((compound) =>
      compound.ingredients.map((item) =>
        line(item, `Racikan ${compound.form} · ${compound.quantity} ${compound.form} · ${compound.signa}`),
      ),
    ),
  ];
}

/** Stock per medicine from its usable batches. */
export function availableFromBatches(batches: readonly StockBatch[]) {
  const available = new Map<string, number>();

  for (const batch of batches)
    available.set(batch.medicine_id, (available.get(batch.medicine_id) ?? 0) + batch.qty_on_hand);

  return available;
}
