import { z } from 'zod';
import type { Role } from '@/lib/auth';
import type { Database } from '@/lib/supabase/database.types';

type VisitStatus = Database['public']['Enums']['visit_status'];

export type QueueVisit = {
  id: string;
  queue_no: number;
  status: VisitStatus;
  doctor_id: string;
  poli_id: string;
  called_at: string | null;
  skipped_at: string | null;
  /** Last status change: when the patient arrived at their current station. */
  updated_at: string;
  /** Registration time: how long the patient has been at the clinic. */
  created_at?: string;
  payer_type: string;
  patient: { full_name: string; mrn: string; sex: string; birth_date: string } | null;
  poli: { name: string } | null;
  doctor: { full_name: string } | null;
};

export type Actor = { role: Role; userId: string };

/** Roles that see the queue board. Cashier and pharmacy get their own worklists. */
export const QUEUE_VIEWER_ROLES = [
  'front_desk',
  'nurse',
  'doctor',
  'admin',
  'owner',
] as const satisfies readonly Role[];

// Mirrors private.visits_before_update(); the database is the real guard.
const isOwnDoctor = (actor: Actor, visit: QueueVisit) => actor.role === 'doctor' && visit.doctor_id === actor.userId;

export const canCall = (actor: Actor, visit: QueueVisit) =>
  visit.status === 'waiting' && (isOwnDoctor(actor, visit) || ['nurse', 'admin', 'owner'].includes(actor.role));

export const canSkip = (actor: Actor, visit: QueueVisit) =>
  visit.status === 'waiting' &&
  visit.skipped_at === null &&
  (isOwnDoctor(actor, visit) || ['nurse', 'front_desk', 'admin', 'owner'].includes(actor.role));

export const canStartExam = (actor: Actor, visit: QueueVisit) =>
  visit.status === 'waiting' && isOwnDoctor(actor, visit);

/** Nurse triage, or the visit's own doctor, while the patient waits. */
export const canRecordVitals = (actor: Actor, visit: QueueVisit) =>
  visit.status === 'waiting' && (actor.role === 'nurse' || isOwnDoctor(actor, visit));

/** Mirrors EXAM_VIEWER_ROLES (and the clinical RLS policies). */
export const canOpenExam = (actor: Actor) => ['doctor', 'nurse', 'owner'].includes(actor.role);

export const canCancel = (actor: Actor, visit: QueueVisit) =>
  (visit.status === 'registered' || visit.status === 'waiting') &&
  ['front_desk', 'admin', 'owner'].includes(actor.role);

const byQueueNo = (a: QueueVisit, b: QueueVisit) => a.queue_no - b.queue_no;

export type QueueLanes = {
  /** Called and not yet in the room, latest call first. */
  called: QueueVisit[];
  waiting: QueueVisit[];
  skipped: QueueVisit[];
  inExam: QueueVisit[];
  toPharmacy: QueueVisit[];
  toCashier: QueueVisit[];
  done: QueueVisit[];
  cancelled: QueueVisit[];
};

/** Sorts today's visits into the stations of the journey, each in queue order. */
export function buildLanes(visits: readonly QueueVisit[]): QueueLanes {
  const lanes: QueueLanes = {
    called: [],
    waiting: [],
    skipped: [],
    inExam: [],
    toPharmacy: [],
    toCashier: [],
    done: [],
    cancelled: [],
  };

  for (const visit of [...visits].sort(byQueueNo)) {
    if (visit.status === 'registered' || visit.status === 'waiting') {
      if (visit.skipped_at) lanes.skipped.push(visit);
      else if (visit.called_at) lanes.called.push(visit);
      else lanes.waiting.push(visit);
    } else if (visit.status === 'in_exam') lanes.inExam.push(visit);
    else if (visit.status === 'to_pharmacy') lanes.toPharmacy.push(visit);
    else if (visit.status === 'to_cashier') lanes.toCashier.push(visit);
    else if (visit.status === 'done') lanes.done.push(visit);
    else lanes.cancelled.push(visit);
  }

  lanes.called.sort((a, b) => b.called_at!.localeCompare(a.called_at!));

  return lanes;
}

/** Polis present today, for the filter chips. */
export function polisOf(visits: readonly QueueVisit[]) {
  const polis = new Map<string, string>();

  for (const visit of visits) polis.set(visit.poli_id, visit.poli?.name ?? '-');

  return [...polis].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

/**
 * A doctor's room right now, in the order they act on it: the patient being
 * examined, else the one already called, else the next number to call.
 */
export function doctorRoom(visits: readonly QueueVisit[], doctorId: string) {
  const mine = visits.filter((visit) => visit.doctor_id === doctorId);
  const lanes = buildLanes(mine);

  return {
    examining: lanes.inExam[0],
    called: lanes.called[0],
    next: nextToCall(mine, doctorId),
    waitingCount: lanes.waiting.length + lanes.called.length,
  };
}

/** The next patient for a doctor: lowest number still waiting, not yet called or skipped. */
export function nextToCall(visits: readonly QueueVisit[], doctorId: string) {
  return [...visits]
    .filter(
      (visit) => visit.doctor_id === doctorId && visit.status === 'waiting' && !visit.skipped_at && !visit.called_at,
    )
    .sort(byQueueNo)[0];
}

export const cancelVisitSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Alasan pembatalan wajib diisi.')
    .max(200, 'Alasan terlalu panjang, maksimal 200 karakter.'),
});

export type CancelVisitValues = z.output<typeof cancelVisitSchema>;

const QUEUE_ERRORS: Record<string, string> = {
  not_allowed: 'Anda tidak punya akses untuk tindakan ini.',
  not_your_patient: 'Hanya dokter yang menangani pasien ini yang bisa memulai pemeriksaan.',
  not_waiting: 'Pasien ini sudah tidak dalam antrean. Daftar diperbarui otomatis.',
  invalid_transition: 'Status kunjungan sudah berubah. Daftar diperbarui otomatis, coba lagi.',
  cancel_reason_required: 'Alasan pembatalan wajib diisi.',
};

/** Maps a guard error from private.visits_before_update() to a message. */
export function queueErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === 'P0001' && error.message && QUEUE_ERRORS[error.message]) return QUEUE_ERRORS[error.message];
  if (error.code === '42501') return QUEUE_ERRORS.not_allowed;

  return 'Antrean gagal diperbarui. Coba lagi, atau hubungi admin jika terus terjadi.';
}
