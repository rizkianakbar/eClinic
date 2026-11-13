import { z } from 'zod';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "08:00:00" (Postgres time) -> "08:00". */
export function toHourMinute(time: string) {
  return time.slice(0, 5);
}

const day = z.coerce
  .number<string | number>()
  .int()
  .min(1, 'schedules.errors.pickDay')
  .max(7, 'schedules.errors.pickDay');

/**
 * One form for create and edit. `days` creates one schedule row per day (a doctor
 * working Monday to Wednesday ticks three days); editing changes a single row.
 */
export const scheduleSchema = z
  .object({
    doctor_id: z.uuid('schedules.errors.pickDoctor'),
    poli_id: z.uuid('schedules.errors.pickPoli'),
    days: z
      .array(day)
      .min(1, 'schedules.errors.oneDay')
      .transform((days) => [...new Set(days)].sort()),
    start_time: z
      .string()
      .transform(toHourMinute)
      .refine((value) => TIME.test(value), 'schedules.errors.startRequired'),
    end_time: z
      .string()
      .transform(toHourMinute)
      .refine((value) => TIME.test(value), 'schedules.errors.endRequired'),
    quota: z.coerce
      .number<string | number>({ error: 'schedules.errors.quotaRequired' })
      .int('schedules.errors.quotaInteger')
      .min(1, 'schedules.errors.quotaMin')
      .max(500, 'schedules.errors.quotaMax'),
  })
  .refine((value) => value.end_time > value.start_time, {
    message: 'schedules.errors.endAfterStart',
    path: ['end_time'],
  });

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type ScheduleValues = z.output<typeof scheduleSchema>;

/** One doctor_schedules row per selected day. */
export function toScheduleRows(values: ScheduleValues) {
  const { days, ...session } = values;

  return days.map((day_of_week) => ({ ...session, day_of_week }));
}

/** Maps a Postgres error on schedule writes to a message key. */
export function scheduleErrorMessage(error: { code?: string }) {
  if (error.code === '23P01') {
    return 'schedules.errors.overlap';
  }

  if (error.code === '42501') {
    return 'schedules.errors.invalidRef';
  }

  return 'schedules.errors.saveFailed';
}
