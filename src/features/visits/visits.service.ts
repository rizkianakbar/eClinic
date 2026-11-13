import "server-only";
import { isoWeekday, todayInJakarta } from "@/lib/dates";
import type { ActionResult } from "@/lib/query";
import type { SupabaseClient } from "@/lib/supabase/server";
import { visitErrorMessage, type CreateVisitValues, type PracticeSession } from "./visits.lib";

/** Queue number, date, poli, doctor and quota are decided by the database (visits_before_insert). */
export async function createVisit(
  supabase: SupabaseClient,
  values: CreateVisitValues,
): Promise<ActionResult<{ id: string; queueNo: number }>> {
  const { data, error } = await supabase.rpc("create_visit", {
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
    .from("doctor_schedules")
    .select(
      "id, doctor_id, start_time, end_time, quota, doctor:profiles(full_name, is_active), poli:polis(name, is_active), taken:visits(count)",
    )
    .eq("day_of_week", isoWeekday(today))
    .eq("is_active", true)
    .eq("visits.visit_date", today)
    .neq("visits.status", "cancelled")
    .order("start_time");
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

export async function listPatientVisits(supabase: SupabaseClient, patientId: string) {
  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, visit_date, queue_no, status, payer_type, created_at, cancel_reason, poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)",
    )
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`listPatientVisits failed: ${error.code}`);
  return data;
}

/** One visit with who, where and its timeline stamps (no clinical content). */
export async function getVisit(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, visit_date, queue_no, status, payer_type, called_at, skipped_at, cancel_reason, created_at, patient:patients(id, full_name, mrn), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)",
    )
    .eq("id", visitId)
    .maybeSingle();
  if (error) throw new Error(`getVisit failed: ${error.code}`);
  return data;
}

/**
 * The primary diagnosis of each visit (clinical roles only: RLS hides diagnoses
 * from front desk and cashier, who get an empty map).
 */
/**
 * A patient's primary diagnosis per visit, looked up by patient (inner join on visits), so it can load in
 * the same round trip as the visits themselves instead of after them.
 */
export async function listPatientPrimaryDiagnoses(supabase: SupabaseClient, patientId: string) {
  const { data, error } = await supabase
    .from("visit_diagnoses")
    .select("visit_id, icd10_code, icd10:icd10_codes(name, name_id), visit:visits!inner(patient_id)")
    .eq("visit.patient_id", patientId)
    .eq("is_primary", true);
  if (error) throw new Error(`listPatientPrimaryDiagnoses failed: ${error.code}`);
  return new Map(
    data.map((row) => [row.visit_id, { code: row.icd10_code, name: row.icd10?.name_id ?? row.icd10?.name ?? row.icd10_code }]),
  );
}

