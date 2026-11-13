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

/** Today's open practice sessions with how many places are taken. */
export async function listTodaySessions(supabase: SupabaseClient): Promise<PracticeSession[]> {
  const today = todayInJakarta();

  const { data: schedules, error } = await supabase
    .from("doctor_schedules")
    .select("id, doctor_id, start_time, end_time, quota, doctor:profiles(full_name, is_active), poli:polis(name, is_active)")
    .eq("day_of_week", isoWeekday(today))
    .eq("is_active", true)
    .order("start_time");
  if (error) throw new Error(`listTodaySessions failed: ${error.code}`);

  const open = schedules.filter((schedule) => schedule.doctor?.is_active && schedule.poli?.is_active);
  if (open.length === 0) return [];

  const { data: visits, error: visitsError } = await supabase
    .from("visits")
    .select("schedule_id")
    .eq("visit_date", today)
    .neq("status", "cancelled")
    .in(
      "schedule_id",
      open.map((schedule) => schedule.id),
    );
  if (visitsError) throw new Error(`listTodaySessions visits failed: ${visitsError.code}`);

  const taken = new Map<string, number>();
  for (const visit of visits) taken.set(visit.schedule_id, (taken.get(visit.schedule_id) ?? 0) + 1);

  return open.map((schedule) => ({
    id: schedule.id,
    poliName: schedule.poli!.name,
    doctorId: schedule.doctor_id,
    doctorName: schedule.doctor!.full_name,
    startTime: schedule.start_time,
    endTime: schedule.end_time,
    quota: schedule.quota,
    taken: taken.get(schedule.id) ?? 0,
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
export async function listPrimaryDiagnoses(supabase: SupabaseClient, visitIds: string[]) {
  const result = new Map<string, { code: string; name: string }>();
  if (visitIds.length === 0) return result;
  const { data, error } = await supabase
    .from("visit_diagnoses")
    .select("visit_id, icd10_code, icd10:icd10_codes(name, name_id)")
    .in("visit_id", visitIds)
    .eq("is_primary", true);
  if (error) throw new Error(`listPrimaryDiagnoses failed: ${error.code}`);
  for (const row of data) {
    result.set(row.visit_id, { code: row.icd10_code, name: row.icd10?.name_id ?? row.icd10?.name ?? row.icd10_code });
  }
  return result;
}
