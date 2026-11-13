'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { PHARMACY_ROLES } from './inventory.constants';
import {
  type MedicineInput,
  medicineSchema,
  type OpnameValues,
  opnamePayloadSchema,
  type PurchaseFormInput,
  purchaseFormSchema,
  type SupplierInput,
  supplierSchema,
  toPurchasePayload,
} from './inventory.lib';
import {
  createMedicine,
  createSupplier,
  postStockOpname,
  receivePurchase,
  updateMedicine,
  updateSupplier,
} from './inventory.service';

const MANAGERS = ['owner', 'admin'] as const;
const NOT_FOUND: ActionResult<never> = { ok: false, error: 'Data tidak ditemukan. Muat ulang halaman.' };
const isId = (value: string) => z.uuid().safeParse(value).success;

const invalid = (error: z.ZodError): ActionResult<never> => ({
  ok: false,
  error: error.issues[0]?.message ?? 'Data tidak valid.',
});

export async function createMedicineAction(input: MedicineInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);

  const parsed = medicineSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return createMedicine(await createClient(), parsed.data);
}

export async function updateMedicineAction(medicineId: string, input: MedicineInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(medicineId)) return NOT_FOUND;

  const parsed = medicineSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return updateMedicine(await createClient(), medicineId, parsed.data);
}

export async function setMedicineActiveAction(medicineId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(medicineId)) return NOT_FOUND;

  return updateMedicine(await createClient(), medicineId, { is_active: isActive === true });
}

export async function createSupplierAction(input: SupplierInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);

  const parsed = supplierSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return createSupplier(await createClient(), parsed.data);
}

export async function updateSupplierAction(supplierId: string, input: SupplierInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(supplierId)) return NOT_FOUND;

  const parsed = supplierSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return updateSupplier(await createClient(), supplierId, parsed.data);
}

export async function setSupplierActiveAction(supplierId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(supplierId)) return NOT_FOUND;

  return updateSupplier(await createClient(), supplierId, { is_active: isActive === true });
}

export async function receivePurchaseAction(input: PurchaseFormInput): Promise<ActionResult<{ id: string }>> {
  await requireRole(...PHARMACY_ROLES);

  const parsed = purchaseFormSchema(todayInJakarta()).safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data pembelian tidak valid.' };

  return receivePurchase(await createClient(), toPurchasePayload(parsed.data));
}

export async function postStockOpnameAction(input: OpnameValues): Promise<ActionResult<{ id: string }>> {
  await requireRole(...PHARMACY_ROLES);

  const parsed = opnamePayloadSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data opname tidak valid.' };

  return postStockOpname(await createClient(), parsed.data);
}
