import { z } from 'zod';
import type { Database } from '@/lib/supabase/database.types';
import { JOURNEY, type JourneyStatus } from './visits.constants';

type JourneyVisitStatus = Database['public']['Enums']['visit_status'];

export const createVisitSchema = z.object({
  patient_id: z.uuid('visits.errors.invalidPatient'),
  schedule_id: z.uuid('visits.errors.pickSchedule'),
  payer_type: z.enum(['umum', 'bpjs'], { error: 'visits.errors.pickPayer' }),
});

export type CreateVisitInput = z.input<typeof createVisitSchema>;
export type CreateVisitValues = z.output<typeof createVisitSchema>;

/** Keys raised by private.visits_before_insert(); each has a message under visits.errors. */
const REGISTRATION_ERRORS = new Set([
  'quota_full',
  'schedule_inactive',
  'schedule_not_today',
  'schedule_not_found',
  'patient_inactive',
  'patient_not_found',
  'bpjs_number_missing',
]);

/** Maps a Postgres error from create_visit() to a message key the front desk can act on. */
export function visitErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === 'P0001' && error.message && REGISTRATION_ERRORS.has(error.message)) {
    return `visits.errors.${error.message}`;
  }

  if (error.code === '23505') return 'visits.errors.duplicateToday';
  if (error.code === '42501') return 'visits.errors.noAccess';

  return 'visits.errors.failed';
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
