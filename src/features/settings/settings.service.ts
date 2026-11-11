import "server-only";
import type { Session } from "@/lib/auth";
import type { ActionResult } from "@/lib/query";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@/lib/supabase/server";
import {
  masterDataErrorMessage,
  staffAuthErrorMessage,
  type PoliValues,
  type StaffCreateValues,
  type StaffValues,
} from "./settings.lib";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Effectively permanent; lifted on reactivation. Kills refresh of existing sessions. */
const DEACTIVATED_BAN = "876000h";

const NOT_ALLOWED =
  "Akun ini tidak bisa Anda ubah. Akun sendiri dan akun pemilik hanya bisa diubah oleh pemilik klinik.";

// Staff ----------------------------------------------------------------------

export async function listStaff(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, nik, sip_number, is_active")
    .order("is_active", { ascending: false })
    .order("full_name");
  if (error) throw new Error(`listStaff failed: ${error.code}`);
  return data;
}

/**
 * Creates the login with the admin API, then the profile with the user's client
 * so RLS decides whether this actor may add this role. Rolls back the login if
 * the profile is refused.
 */
export async function createStaff(
  supabase: SupabaseClient,
  admin: AdminClient,
  session: Session,
  values: StaffCreateValues,
): Promise<ActionResult> {
  if (values.role === "owner" && session.role !== "owner") return { ok: false, error: NOT_ALLOWED };

  const { data, error } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
  });
  if (error) return { ok: false, error: staffAuthErrorMessage(error) };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    clinic_id: session.clinicId,
    email: values.email,
    full_name: values.full_name,
    role: values.role,
    nik: values.nik,
    sip_number: values.sip_number,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: masterDataErrorMessage(profileError, "Akun staf ini sudah ada.") };
  }
  return { ok: true, data: undefined };
}

export async function updateStaff(
  supabase: SupabaseClient,
  session: Session,
  staffId: string,
  values: StaffValues,
): Promise<ActionResult> {
  if (staffId === session.userId) return { ok: false, error: NOT_ALLOWED };
  if (values.role === "owner" && session.role !== "owner") return { ok: false, error: NOT_ALLOWED };

  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", staffId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: masterDataErrorMessage(error, "Akun staf ini sudah ada.") };
  if (!data) return { ok: false, error: NOT_ALLOWED };
  return { ok: true, data: undefined };
}

/** Deactivation revokes access immediately (RLS helpers return null) and blocks session refresh. */
export async function setStaffActive(
  supabase: SupabaseClient,
  admin: AdminClient,
  session: Session,
  staffId: string,
  isActive: boolean,
): Promise<ActionResult> {
  if (staffId === session.userId) return { ok: false, error: NOT_ALLOWED };

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", staffId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: masterDataErrorMessage(error, "") };
  if (!data) return { ok: false, error: NOT_ALLOWED };

  const { error: banError } = await admin.auth.admin.updateUserById(staffId, {
    ban_duration: isActive ? "none" : DEACTIVATED_BAN,
  });
  if (banError) {
    console.error("setStaffActive: ban update failed", { staffId, code: banError.code });
    return {
      ok: false,
      error: isActive
        ? "Akun diaktifkan, tetapi login belum dibuka. Coba aktifkan lagi."
        : "Akses sudah dicabut, tetapi sesi login lama belum diputus. Coba nonaktifkan lagi.",
    };
  }
  return { ok: true, data: undefined };
}

export async function resetStaffPassword(
  supabase: SupabaseClient,
  admin: AdminClient,
  session: Session,
  staffId: string,
  password: string,
): Promise<ActionResult> {
  // RLS limits this read to the actor's clinic.
  const { data: target } = await supabase.from("profiles").select("role").eq("id", staffId).maybeSingle();
  if (!target || (target.role === "owner" && session.role !== "owner")) return { ok: false, error: NOT_ALLOWED };

  const { error } = await admin.auth.admin.updateUserById(staffId, { password });
  if (error) return { ok: false, error: staffAuthErrorMessage(error) };
  return { ok: true, data: undefined };
}

// Polis ----------------------------------------------------------------------

const DUPLICATE_POLI = "Nama poli ini sudah ada. Gunakan nama lain.";

export async function listPolis(supabase: SupabaseClient, options: { activeOnly?: boolean } = {}) {
  let query = supabase.from("polis").select("id, name, bpjs_poli_code, is_active");
  if (options.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query.order("is_active", { ascending: false }).order("name");
  if (error) throw new Error(`listPolis failed: ${error.code}`);
  return data;
}

export async function createPoli(
  supabase: SupabaseClient,
  clinicId: string,
  values: PoliValues,
): Promise<ActionResult> {
  const { error } = await supabase.from("polis").insert({ ...values, clinic_id: clinicId });
  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_POLI) };
  return { ok: true, data: undefined };
}

export async function updatePoli(
  supabase: SupabaseClient,
  poliId: string,
  values: Partial<PoliValues> & { is_active?: boolean },
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("polis")
    .update(values)
    .eq("id", poliId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_POLI) };
  if (!data) return { ok: false, error: "Poli tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  return { ok: true, data: undefined };
}
