'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import {
  type CompoundInput,
  compoundSchema,
  type PrescriptionItemInput,
  prescriptionItemSchema,
} from './prescriptions.lib';
import { addCompound, addPrescriptionItem, removeCompound, removePrescriptionItem } from './prescriptions.service';

const NOT_FOUND: ActionResult<never> = { ok: false, error: 'Data tidak ditemukan. Muat ulang halaman.' };
const isId = (value: string) => z.uuid().safeParse(value).success;

const invalid = (error: z.ZodError): ActionResult<never> => ({
  ok: false,
  error: error.issues[0]?.message ?? 'Data resep tidak valid.',
});

export async function addPrescriptionItemAction(visitId: string, input: PrescriptionItemInput): Promise<ActionResult> {
  await requireRole('doctor');
  if (!isId(visitId)) return NOT_FOUND;

  const parsed = prescriptionItemSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return addPrescriptionItem(await createClient(), visitId, parsed.data);
}

export async function addCompoundAction(visitId: string, input: CompoundInput): Promise<ActionResult> {
  await requireRole('doctor');
  if (!isId(visitId)) return NOT_FOUND;

  const parsed = compoundSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return addCompound(await createClient(), visitId, parsed.data);
}

export async function removePrescriptionItemAction(itemId: string): Promise<ActionResult> {
  await requireRole('doctor');
  if (!isId(itemId)) return NOT_FOUND;

  return removePrescriptionItem(await createClient(), itemId);
}

export async function removeCompoundAction(compoundId: string): Promise<ActionResult> {
  await requireRole('doctor');
  if (!isId(compoundId)) return NOT_FOUND;

  return removeCompound(await createClient(), compoundId);
}
