'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { type DispenseValues, dispensePayloadSchema } from './pharmacy.lib';
import { dispense } from './pharmacy.service';

export async function dispenseAction(visitId: string, input: DispenseValues): Promise<ActionResult> {
  await requireRole('pharmacist');

  if (!z.uuid().safeParse(visitId).success) return { ok: false, error: 'pharmacy.errors.notFound' };

  const parsed = dispensePayloadSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'pharmacy.errors.invalid' };

  return dispense(await createClient(), visitId, parsed.data);
}
