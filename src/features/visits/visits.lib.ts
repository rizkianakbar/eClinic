import { z } from 'zod';
import type { Database } from '@/lib/supabase/database.types';

type JourneyVisitStatus = Database['public']['Enums']['visit_status'];

export const createVisitSchema = z.object({
  patient_id: z.uuid('Pasien tidak valid. Muat ulang halaman.'),
  schedule_id: z.uuid('Pilih jadwal dokter.'),
  payer_type: z.enum(['umum', 'bpjs'], { error: 'Pilih jenis pembayaran.' }),
});

export type CreateVisitInput = z.input<typeof createVisitSchema>;
export type CreateVisitValues = z.output<typeof createVisitSchema>;

/** Keys raised by private.visits_before_insert(). */
const REGISTRATION_ERRORS: Record<string, string> = {
  quota_full: 'Kuota dokter untuk sesi ini sudah penuh. Pilih jadwal lain.',
  schedule_inactive: 'Jadwal, dokter, atau poli ini sudah tidak aktif. Muat ulang halaman lalu pilih jadwal lain.',
  schedule_not_today: 'Jadwal ini bukan untuk hari ini. Muat ulang halaman lalu pilih jadwal hari ini.',
  schedule_not_found: 'Jadwal tidak ditemukan. Muat ulang halaman lalu coba lagi.',
  patient_inactive: 'Pasien ini nonaktif dan tidak bisa didaftarkan.',
  patient_not_found: 'Pasien tidak ditemukan. Muat ulang halaman lalu coba lagi.',
  bpjs_number_missing: 'Pasien belum punya nomor BPJS. Isi nomor BPJS di data pasien, atau pilih Umum.',
};

/** Maps a Postgres error from create_visit() to a message the front desk can act on. */
export function visitErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === 'P0001' && error.message && REGISTRATION_ERRORS[error.message]) {
    return REGISTRATION_ERRORS[error.message];
  }

  if (error.code === '23505') {
    return 'Pasien sudah terdaftar di poli ini hari ini. Lihat riwayat kunjungan di bawah.';
  }

  if (error.code === '42501') {
    return 'Anda tidak punya akses untuk mendaftarkan kunjungan. Hubungi admin klinik.';
  }

  return 'Kunjungan gagal didaftarkan. Coba lagi, atau hubungi admin jika terus terjadi.';
}

export type PracticeSession = {
  id: string;
  poliName: string;
  doctorId?: string;
  doctorName: string;
  startTime: string;
  endTime: string;
  quota: number;
  taken: number;
};

/**
 * Default choice: the first session with room that has not ended yet
 * ("HH:MM" Jakarta); if every open session has ended, the first with room.
 */
export function firstOpenSession(sessions: readonly PracticeSession[], now?: string) {
  const open = sessions.filter((session) => session.taken < session.quota);

  return (now ? open.find((session) => session.endTime.slice(0, 5) > now) : undefined) ?? open[0];
}

/** Whether a session's hours are already over ("HH:MM" Jakarta). */
export function sessionEnded(session: Pick<PracticeSession, 'endTime'>, now: string) {
  return session.endTime.slice(0, 5) <= now;
}

/** The five stations of a visit, in order (registered counts as waiting). */
export const JOURNEY = [
  { status: 'waiting', label: 'Ruang tunggu', short: 'Tunggu', hint: 'menunggu dipanggil' },
  { status: 'in_exam', label: 'Ruang periksa', short: 'Periksa', hint: 'bersama dokter' },
  { status: 'to_pharmacy', label: 'Farmasi', short: 'Farmasi', hint: 'menunggu obat' },
  { status: 'to_cashier', label: 'Kasir', short: 'Kasir', hint: 'menunggu bayar' },
  { status: 'done', label: 'Pulang', short: 'Pulang', hint: 'selesai hari ini' },
] as const satisfies readonly { status: JourneyVisitStatus; label: string; short: string; hint: string }[];

export type JourneyStatus = (typeof JOURNEY)[number]['status'];

/** Count of today's visits per station; cancelled visits are left out. */
export function journeyCounts(visits: readonly { status: JourneyVisitStatus }[]) {
  const counts: Record<JourneyStatus, number> = { waiting: 0, in_exam: 0, to_pharmacy: 0, to_cashier: 0, done: 0 };

  for (const visit of visits) {
    if (visit.status === 'cancelled') continue;

    counts[visit.status === 'registered' ? 'waiting' : visit.status] += 1;
  }

  return counts;
}

/**
 * When the patient arrived at the station they are at now, for wait timers. In the waiting room that is
 * registration (calling or recording vitals updates the visit but is not a new arrival); after that, the
 * last status change.
 */
export function stationSince(visit: { status: string; created_at?: string; updated_at: string }) {
  const inWaitingRoom = visit.status === 'waiting' || visit.status === 'registered';

  return inWaitingRoom && visit.created_at ? visit.created_at : visit.updated_at;
}

/** Index of a visit's station on the journey line; -1 when cancelled. */
export function journeyIndex(status: JourneyVisitStatus) {
  if (status === 'cancelled') return -1;

  return JOURNEY.findIndex((station) => station.status === (status === 'registered' ? 'waiting' : status));
}

/** Riwayat kunjungan: visits per page. */
export const VISIT_HISTORY_PAGE_SIZE = 25;
