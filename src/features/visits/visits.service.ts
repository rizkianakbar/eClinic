import 'server-only';
import { escapeLike, parsePatientSearch } from '@/features/patients/patients.lib';
import type { DateRange } from '@/features/reports/reports.lib';
import { isoWeekday, todayInJakarta } from '@/lib/dates';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import type { VisitStatus } from './visits.constants';
import { type CreateVisitValues, type PracticeSession, VISIT_HISTORY_PAGE_SIZE, visitErrorMessage } from './visits.lib';

/** Queue number, date, poli, doctor and quota are decided by the database (visits_before_insert). */
export async function createVisit(
  supabase: SupabaseClient,
  values: CreateVisitValues,
): Promise<ActionResult<{ id: string; queueNo: number }>> {
  const { data, error } = await supabase.rpc('create_visit', {
    p_patient_id: values.patient_id,
    p_schedule_id: values.schedule_id,
    p_payer_type: values.payer_type,
  });

  if (error) return { ok: false, error: visitErrorMessage(error) };

  return { ok: true, data: { id: data.id, queueNo: data.queue_no } };
}

/**
 * Today's open practice sessions with how many places are taken. One round trip:
 * the non-cancelled visits of today are counted inside the same query.
 */
export async function listTodaySessions(supabase: SupabaseClient): Promise<PracticeSession[]> {
  const today = todayInJakarta();

  const { data: schedules, error } = await supabase
    .from('doctor_schedules')
    .select(
      'id, doctor_id, start_time, end_time, quota, doctor:profiles(full_name, is_active), poli:polis(name, is_active), taken:visits(count)',
    )
    .eq('day_of_week', isoWeekday(today))
    .eq('is_active', true)
    .eq('visits.visit_date', today)
    .neq('visits.status', 'cancelled')
    .order('start_time');

  if (error) throw new Error(`listTodaySessions failed: ${error.code}`);

  return schedules
    .filter((schedule) => schedule.doctor?.is_active && schedule.poli?.is_active)
    .map((schedule) => ({
      id: schedule.id,
      poliName: schedule.poli!.name,
      doctorId: schedule.doctor_id,
      doctorName: schedule.doctor!.full_name,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      quota: schedule.quota,
      taken: schedule.taken[0]?.count ?? 0,
    }));
}

/** A patient's visit at any branch of the organization (patient_visit_history). */
export type PatientVisit = {
  id: string;
  visit_date: string;
  queue_no: number;
  status: VisitStatus;
  payer_type: string;
  created_at: string;
  cancel_reason: string | null;
  clinic: { id: string; name: string };
  /** At the branch I am working at: only these open (the others' pages belong to their branch). */
  here: boolean;
  poli: { name: string } | null;
  doctor: { full_name: string } | null;
  /** The primary diagnosis; null for roles that may not read diagnoses (front desk, cashier). */
  diagnosis: { code: string; name: string } | null;
};

/**
 * Riwayat kunjungan of one patient across every branch, newest first, with the primary diagnosis where the role
 * may read it. Through a checked function: the visit tables themselves stay per branch, so queues and worklists
 * never show another branch's patients.
 */
export async function listPatientVisits(supabase: SupabaseClient, patientId: string) {
  const { data, error } = await supabase.rpc('patient_visit_history', { p_patient_id: patientId });

  if (error) throw new Error(`listPatientVisits failed: ${error.code}`);

  return (data ?? []) as unknown as PatientVisit[];
}

/** One visit with who, where and its timeline stamps (no clinical content). */
export async function getVisit(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('visits')
    .select(
      'id, visit_date, queue_no, status, payer_type, called_at, skipped_at, cancel_reason, created_at, patient:patients(id, full_name, mrn), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)',
    )
    .eq('id', visitId)
    .maybeSingle();

  if (error) throw new Error(`getVisit failed: ${error.code}`);

  return data;
}

/**
 * Riwayat kunjungan: every visit in the period, newest first, with who, where, the primary diagnosis
 * (empty for roles that may not read diagnoses: RLS) and where the visit stands. One round trip; the date
 * range runs on (clinic_id, visit_date). Search matches the patient by name, MRN, NIK or BPJS number.
 */
export async function listVisitHistory(
  supabase: SupabaseClient,
  options: { range: DateRange; query: string; page: number },
) {
  const from = (options.page - 1) * VISIT_HISTORY_PAGE_SIZE;

  let request = supabase
    .from('visits')
    .select(
      'id, visit_date, queue_no, status, payer_type, created_at, patient:patients!inner(id, full_name, mrn, sex, birth_date), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name), diagnoses:visit_diagnoses(icd10_code, icd10:icd10_codes(name, name_id))',
      { count: 'exact' },
    )
    .gte('visit_date', options.range.from)
    .lte('visit_date', options.range.to)
    .eq('diagnoses.is_primary', true);

  const search = parsePatientSearch(options.query);

  if (search?.kind === 'number') {
    request = request.or(`mrn.eq.${search.digits},nik.eq.${search.digits},bpjs_number.eq.${search.digits}`, {
      referencedTable: 'patient',
    });
  } else if (search?.kind === 'name') {
    request = request.ilike('patient.full_name', `%${escapeLike(search.text)}%`);
  }

  const { data, count, error } = await request
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, from + VISIT_HISTORY_PAGE_SIZE - 1);

  if (error) throw new Error(`listVisitHistory failed: ${error.code}`);

  return { visits: data, total: count ?? 0 };
}
