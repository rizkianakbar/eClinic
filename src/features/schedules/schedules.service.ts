import 'server-only';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import { type ScheduleValues, scheduleErrorMessage, toScheduleRows } from './schedules.lib';

export async function listSchedules(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('doctor_schedules')
    .select(
      'id, doctor_id, poli_id, day_of_week, start_time, end_time, quota, is_active, doctor:profiles(full_name), poli:polis(name)',
    )
    .order('day_of_week')
    .order('start_time');

  if (error) throw new Error(`listSchedules failed: ${error.code}`);

  return data;
}

/** Active doctors who can be scheduled. */
export async function listDoctors(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'doctor')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw new Error(`listDoctors failed: ${error.code}`);

  return data;
}

/** One row per selected day, in a single insert: all days are saved or none. */
export async function createSchedules(
  supabase: SupabaseClient,
  clinicId: string,
  values: ScheduleValues,
): Promise<ActionResult> {
  const rows = toScheduleRows(values).map((row) => ({ ...row, clinic_id: clinicId }));
  const { error } = await supabase.from('doctor_schedules').insert(rows);

  if (error) return { ok: false, error: scheduleErrorMessage(error) };

  return { ok: true, data: undefined };
}

export async function updateSchedule(
  supabase: SupabaseClient,
  scheduleId: string,
  values: Partial<ReturnType<typeof toScheduleRows>[number]> & { is_active?: boolean },
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('doctor_schedules')
    .update(values)
    .eq('id', scheduleId)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, error: scheduleErrorMessage(error) };
  if (!data) return { ok: false, error: 'schedules.errors.notFound' };

  return { ok: true, data: undefined };
}
