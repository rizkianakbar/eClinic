'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { type ScheduleInput, scheduleSchema, toScheduleRows } from './schedules.lib';
import { createSchedules, updateSchedule } from './schedules.service';

const MANAGERS = ['owner', 'admin'] as const;
const NOT_FOUND: ActionResult<never> = { ok: false, error: 'Jadwal tidak ditemukan. Muat ulang halaman.' };

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: error.issues[0]?.message ?? 'Data jadwal tidak valid.' };
}

export async function createScheduleAction(input: ScheduleInput): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  const parsed = scheduleSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  return createSchedules(await createClient(), session.clinicId, parsed.data);
}

export async function updateScheduleAction(scheduleId: string, input: ScheduleInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!z.uuid().safeParse(scheduleId).success) return NOT_FOUND;

  const parsed = scheduleSchema.safeParse(input);

  if (!parsed.success) return invalid(parsed.error);

  const [row, ...extra] = toScheduleRows(parsed.data);

  if (extra.length > 0)
    return { ok: false, error: 'Ubah jadwal hanya untuk satu hari. Tambah hari lain lewat Tambah jadwal.' };

  return updateSchedule(await createClient(), scheduleId, row);
}

export async function setScheduleActiveAction(scheduleId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!z.uuid().safeParse(scheduleId).success) return NOT_FOUND;

  return updateSchedule(await createClient(), scheduleId, { is_active: isActive === true });
}
