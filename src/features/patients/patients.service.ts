import "server-only";
import type { SupabaseClient } from "@/lib/supabase/server";
import { patientWriteErrorMessage, type PatientValues } from "./patients.lib";

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
