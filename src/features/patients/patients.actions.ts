'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { PATIENT_EDITOR_ROLES } from './patients.constants';
import { type PatientInput, patientSchema } from './patients.lib';
import { createPatient, updatePatient } from './patients.service';

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: error.issues[0]?.message ?? 'Data pasien tidak valid.' };
}

export async function createPatientAction(input: PatientInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(...PATIENT_EDITOR_ROLES);
  const parsed = patientSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return createPatient(await createClient(), session.clinicId, parsed.data);
}

export async function updatePatientAction(patientId: string, input: PatientInput): Promise<ActionResult> {
  await requireRole(...PATIENT_EDITOR_ROLES);

  const id = z.uuid().safeParse(patientId);

  if (!id.success) return { ok: false, error: 'Pasien tidak ditemukan.' };

  const parsed = patientSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return updatePatient(await createClient(), id.data, parsed.data);
}
