'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { type DispenseValues, dispensePayloadSchema } from './pharmacy.lib';
import { dispense } from './pharmacy.service';

export async function dispenseAction(visitId: string, input: DispenseValues): Promise<ActionResult> {
  await requireRole('pharmacist');

  if (!z.uuid().safeParse(visitId).success)
    return { ok: false, error: 'Kunjungan tidak ditemukan. Muat ulang halaman.' };

  const parsed = dispensePayloadSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data penyerahan tidak valid.' };

  return dispense(await createClient(), visitId, parsed.data);
}
