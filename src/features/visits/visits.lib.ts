import { z } from "zod";

export const createVisitSchema = z.object({
  patient_id: z.uuid("Pasien tidak valid. Muat ulang halaman."),
  schedule_id: z.uuid("Pilih jadwal dokter."),
  payer_type: z.enum(["umum", "bpjs"], { error: "Pilih jenis pembayaran." }),
});

export type CreateVisitInput = z.input<typeof createVisitSchema>;
export type CreateVisitValues = z.output<typeof createVisitSchema>;

/** Keys raised by private.visits_before_insert(). */
const REGISTRATION_ERRORS: Record<string, string> = {
  quota_full: "Kuota dokter untuk sesi ini sudah penuh. Pilih jadwal lain.",
  schedule_inactive: "Jadwal, dokter, atau poli ini sudah tidak aktif. Muat ulang halaman lalu pilih jadwal lain.",
  schedule_not_today: "Jadwal ini bukan untuk hari ini. Muat ulang halaman lalu pilih jadwal hari ini.",
  schedule_not_found: "Jadwal tidak ditemukan. Muat ulang halaman lalu coba lagi.",
  patient_inactive: "Pasien ini nonaktif dan tidak bisa didaftarkan.",
  patient_not_found: "Pasien tidak ditemukan. Muat ulang halaman lalu coba lagi.",
  bpjs_number_missing: "Pasien belum punya nomor BPJS. Isi nomor BPJS di data pasien, atau pilih Umum.",
};

/** Maps a Postgres error from create_visit() to a message the front desk can act on. */
export function visitErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && error.message && REGISTRATION_ERRORS[error.message]) {
    return REGISTRATION_ERRORS[error.message];
  }
  if (error.code === "23505") {
    return "Pasien sudah terdaftar di poli ini hari ini. Lihat riwayat kunjungan di bawah.";
  }
  if (error.code === "42501") {
    return "Anda tidak punya akses untuk mendaftarkan kunjungan. Hubungi admin klinik.";
  }
  return "Kunjungan gagal didaftarkan. Coba lagi, atau hubungi admin jika terus terjadi.";
}

export type PracticeSession = {
  id: string;
  poliName: string;
  doctorName: string;
  startTime: string;
  endTime: string;
  quota: number;
  taken: number;
};

/** Default choice: the first session that still has room. */
export function firstOpenSession(sessions: readonly PracticeSession[]) {
  return sessions.find((session) => session.taken < session.quota);
}
