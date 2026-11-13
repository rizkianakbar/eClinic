import "server-only";
import type { SupabaseClient } from "@/lib/supabase/server";
import { escapeLike, parsePatientSearch, patientWriteErrorMessage, type PatientValues } from "./patients.lib";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** MRN is assigned by the database (column default). */
export async function createPatient(
  supabase: SupabaseClient,
  clinicId: string,
  values: PatientValues,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...values, clinic_id: clinicId })
    .select("id")
    .single();
  if (error) return { ok: false, error: patientWriteErrorMessage(error) };
  return { ok: true, data };
}

export async function updatePatient(
  supabase: SupabaseClient,
  patientId: string,
  values: PatientValues,
): Promise<Result<void>> {
  const { data, error } = await supabase
    .from("patients")
    .update(values)
    .eq("id", patientId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: patientWriteErrorMessage(error) };
  if (!data) return { ok: false, error: "Pasien tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  return { ok: true, data: undefined };
}

export async function getPatient(supabase: SupabaseClient, patientId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("id, mrn, full_name, nik, bpjs_number, birth_date, sex, phone, address, is_active")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw new Error(`getPatient failed: ${error.code}`);
  return data;
}

export const PATIENTS_PAGE_SIZE = 25;

export type PatientPayerFilter = "all" | "bpjs" | "umum";

/**
 * One page of patients, newest first, filtered like the search box and by
 * BPJS membership, with each patient's visit count and last visit date.
 */
export async function listPatients(
  supabase: SupabaseClient,
  options: { query: string; page: number; payer?: PatientPayerFilter },
) {
  const from = (options.page - 1) * PATIENTS_PAGE_SIZE;
  let request = supabase
    .from("patients")
    // Visit dates come embedded (one round trip): count and last visit are worked out below.
    .select("id, mrn, full_name, nik, bpjs_number, birth_date, sex, phone, is_active, created_at, visits(visit_date)", { count: "exact" })
    .neq("visits.status", "cancelled");
  if (options.payer === "bpjs") request = request.not("bpjs_number", "is", null);
  if (options.payer === "umum") request = request.is("bpjs_number", null);
  const search = parsePatientSearch(options.query);
  if (search?.kind === "number") {
    request = request.or(
      `mrn.eq.${search.digits},nik.eq.${search.digits},bpjs_number.eq.${search.digits},phone.ilike.*${search.phone}*`,
    );
  } else if (search?.kind === "name") {
    request = request.ilike("full_name", `%${escapeLike(search.text)}%`);
  }
  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .range(from, from + PATIENTS_PAGE_SIZE - 1);
  if (error) throw new Error(`listPatients failed: ${error.code}`);

  return {
    patients: data.map(({ visits, ...patient }) => ({
      ...patient,
      visitCount: visits.length,
      lastVisit: visits.reduce<string | null>((last, visit) => (!last || visit.visit_date > last ? visit.visit_date : last), null),
    })),
    total: count ?? 0,
  };
}

/** Every active patient's basic facts, for the composition panel (a small clinic: thousands, not millions). */
export async function listPatientDemographics(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, sex, birth_date, bpjs_number, created_at")
    .eq("is_active", true)
    .limit(20_000);
  if (error) throw new Error(`listPatientDemographics failed: ${error.code}`);
  return data;
}
