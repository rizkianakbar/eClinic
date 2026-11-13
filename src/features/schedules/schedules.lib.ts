import { z } from 'zod';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "08:00:00" (Postgres time) -> "08:00". */
export function toHourMinute(time: string) {
  return time.slice(0, 5);
}

const day = z.coerce.number<string | number>().int().min(1, 'Pilih hari.').max(7, 'Pilih hari.');

/**
 * One form for create and edit. `days` creates one schedule row per day (a doctor
 * working Monday to Wednesday ticks three days); editing changes a single row.
 */
export const scheduleSchema = z
  .object({
    doctor_id: z.uuid('Pilih dokter.'),
    poli_id: z.uuid('Pilih poli.'),
    days: z
      .array(day)
      .min(1, 'Pilih minimal satu hari.')
      .transform((days) => [...new Set(days)].sort()),
    start_time: z
      .string()
      .transform(toHourMinute)
      .refine((value) => TIME.test(value), 'Jam mulai wajib diisi.'),
    end_time: z
      .string()
      .transform(toHourMinute)
      .refine((value) => TIME.test(value), 'Jam selesai wajib diisi.'),
    quota: z.coerce
      .number<string | number>({ error: 'Kuota wajib diisi.' })
      .int('Kuota harus bilangan bulat.')
      .min(1, 'Kuota minimal 1 pasien.')
      .max(500, 'Kuota maksimal 500 pasien.'),
  })
  .refine((value) => value.end_time > value.start_time, {
    message: 'Jam selesai harus setelah jam mulai.',
    path: ['end_time'],
  });

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type ScheduleValues = z.output<typeof scheduleSchema>;

/** One doctor_schedules row per selected day. */
export function toScheduleRows(values: ScheduleValues) {
  const { days, ...session } = values;

  return days.map((day_of_week) => ({ ...session, day_of_week }));
}

/** Maps a Postgres error on schedule writes to an actionable message. */
export function scheduleErrorMessage(error: { code?: string }) {
  if (error.code === '23P01') {
    return 'Jadwal bentrok dengan jadwal lain dokter ini pada hari yang dipilih. Tidak ada yang disimpan; ubah jamnya atau nonaktifkan jadwal lama.';
  }

  if (error.code === '42501') {
    return 'Dokter atau poli tidak valid, atau Anda tidak punya akses. Muat ulang halaman lalu coba lagi.';
  }

  return 'Jadwal gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.';
}
