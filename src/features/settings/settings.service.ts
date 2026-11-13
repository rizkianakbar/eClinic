import 'server-only';
import type { DateRange } from '@/features/reports/reports.lib';
import type { Session } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { readSpreadsheet } from '@/lib/spreadsheet';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@/lib/supabase/server';
import { AUDIT_PAGE_SIZE } from './settings.constants';
import {
  type ClinicProfileValues,
  masterDataErrorMessage,
  type PoliValues,
  parseIcd10Rows,
  type StaffCreateValues,
  type StaffValues,
  staffAuthErrorMessage,
} from './settings.lib';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Effectively permanent; lifted on reactivation. Kills refresh of existing sessions. */
const DEACTIVATED_BAN = '876000h';

const NOT_ALLOWED =
  'Akun ini tidak bisa Anda ubah. Akun sendiri dan akun pemilik hanya bisa diubah oleh pemilik klinik.';

// Staff ----------------------------------------------------------------------

export async function listStaff(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, nik, sip_number, is_active')
    .order('is_active', { ascending: false })
    .order('full_name');

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
  if (values.role === 'owner' && session.role !== 'owner') return { ok: false, error: NOT_ALLOWED };

  const { data, error } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
  });

  if (error) return { ok: false, error: staffAuthErrorMessage(error) };

  const { error: profileError } = await supabase.from('profiles').insert({
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

    return { ok: false, error: masterDataErrorMessage(profileError, 'Akun staf ini sudah ada.') };
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
  if (values.role === 'owner' && session.role !== 'owner') return { ok: false, error: NOT_ALLOWED };

  const { data, error } = await supabase.from('profiles').update(values).eq('id', staffId).select('id').maybeSingle();

  if (error) return { ok: false, error: masterDataErrorMessage(error, 'Akun staf ini sudah ada.') };
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
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', staffId)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, error: masterDataErrorMessage(error, '') };
  if (!data) return { ok: false, error: NOT_ALLOWED };

  const { error: banError } = await admin.auth.admin.updateUserById(staffId, {
    ban_duration: isActive ? 'none' : DEACTIVATED_BAN,
  });

  if (banError) {
    console.error('setStaffActive: ban update failed', { staffId, code: banError.code });

    return {
      ok: false,
      error: isActive
        ? 'Akun diaktifkan, tetapi login belum dibuka. Coba aktifkan lagi.'
        : 'Akses sudah dicabut, tetapi sesi login lama belum diputus. Coba nonaktifkan lagi.',
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
  const { data: target } = await supabase.from('profiles').select('role').eq('id', staffId).maybeSingle();

  if (!target || (target.role === 'owner' && session.role !== 'owner')) return { ok: false, error: NOT_ALLOWED };

  const { error } = await admin.auth.admin.updateUserById(staffId, { password });

  if (error) return { ok: false, error: staffAuthErrorMessage(error) };

  return { ok: true, data: undefined };
}

// Polis ----------------------------------------------------------------------

const DUPLICATE_POLI = 'Nama poli ini sudah ada. Gunakan nama lain.';

export async function listPolis(supabase: SupabaseClient, options: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from('polis')
    .select('id, name, bpjs_poli_code, consultation_service_id, is_active, consultation:services(name, price)');

  if (options.activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query.order('is_active', { ascending: false }).order('name');

  if (error) throw new Error(`listPolis failed: ${error.code}`);

  return data;
}

export async function createPoli(
  supabase: SupabaseClient,
  clinicId: string,
  values: PoliValues,
): Promise<ActionResult> {
  const { error } = await supabase.from('polis').insert({ ...values, clinic_id: clinicId });

  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_POLI) };

  return { ok: true, data: undefined };
}

export async function updatePoli(
  supabase: SupabaseClient,
  poliId: string,
  values: Partial<PoliValues> & { is_active?: boolean },
): Promise<ActionResult> {
  const { data, error } = await supabase.from('polis').update(values).eq('id', poliId).select('id').maybeSingle();

  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_POLI) };
  if (!data) return { ok: false, error: 'Poli tidak ditemukan. Muat ulang halaman lalu coba lagi.' };

  return { ok: true, data: undefined };
}

/** Active consultation tariffs, for the poli's consultation fee. */
export async function listConsultationServices(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('type', 'consultation')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(`listConsultationServices failed: ${error.code}`);

  return data;
}

// Clinic profile -------------------------------------------------------------------

const LOGO_BUCKET = 'clinic-assets';

/** The clinic's profile with a short-lived signed URL for the logo (private bucket). */
export async function getClinicProfile(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('clinics')
    .select('id, name, address, phone, email, license_no, logo_path, idle_logout_minutes, updated_at')
    .maybeSingle();

  if (error) throw new Error(`getClinicProfile failed: ${error.code}`);
  if (!data) return null;

  let logoUrl: string | null = null;

  if (data.logo_path) {
    const { data: signed } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(data.logo_path, 60 * 10);

    logoUrl = signed?.signedUrl ?? null;
  }

  return { ...data, logoUrl };
}

export async function updateClinicProfile(
  supabase: SupabaseClient,
  clinicId: string,
  values: ClinicProfileValues,
): Promise<ActionResult> {
  const { data, error } = await supabase.from('clinics').update(values).eq('id', clinicId).select('id').maybeSingle();

  if (error) return { ok: false, error: masterDataErrorMessage(error, '') };

  return data
    ? { ok: true, data: undefined }
    : { ok: false, error: 'Anda tidak punya akses untuk mengubah profil klinik.' };
}

/** Replaces the logo at "<clinic_id>/logo" and stores its path. */
export async function uploadClinicLogo(supabase: SupabaseClient, clinicId: string, file: File): Promise<ActionResult> {
  const path = `${clinicId}/logo`;

  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '60' });

  if (error) return { ok: false, error: 'Logo gagal diunggah. Pastikan file PNG/JPG/WEBP maksimal 1 MB.' };

  return updateLogoPath(supabase, clinicId, path);
}

export async function removeClinicLogo(supabase: SupabaseClient, clinicId: string): Promise<ActionResult> {
  await supabase.storage.from(LOGO_BUCKET).remove([`${clinicId}/logo`]);

  return updateLogoPath(supabase, clinicId, null);
}

async function updateLogoPath(supabase: SupabaseClient, clinicId: string, path: string | null): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('clinics')
    .update({ logo_path: path })
    .eq('id', clinicId)
    .select('id')
    .maybeSingle();

  if (error || !data) return { ok: false, error: 'Profil klinik gagal diperbarui.' };

  return { ok: true, data: undefined };
}

// ICD-10 import -------------------------------------------------------------------

export async function countIcd10Codes(supabase: SupabaseClient) {
  const { count, error } = await supabase.from('icd10_codes').select('code', { count: 'exact', head: true });

  if (error) throw new Error(`countIcd10Codes failed: ${error.code}`);

  return count ?? 0;
}

/**
 * Upserts the clinic's ICD-10 list (global reference table, written with the
 * service role after the caller's role was checked). Existing codes are updated, none deleted.
 */
export async function importIcd10(
  admin: AdminClient,
  file: File,
): Promise<ActionResult<{ imported: number; skipped: { line: number; reason: string }[]; skippedCount: number }>> {
  let parsed: ReturnType<typeof parseIcd10Rows>;

  try {
    parsed = parseIcd10Rows(await readSpreadsheet(file));
  } catch {
    return {
      ok: false,
      error: 'File tidak bisa dibaca. Gunakan Excel (.xlsx) atau CSV dengan kolom: kode, nama, nama Indonesia.',
    };
  }

  if (parsed.rows.length === 0) {
    return { ok: false, error: 'Tidak ada baris ICD-10 yang valid. Periksa kolom: kode, nama, nama Indonesia.' };
  }

  for (let start = 0; start < parsed.rows.length; start += 1000) {
    const chunk = parsed.rows.slice(start, start + 1000).map((row) => ({ ...row, is_active: true }));
    const { error } = await admin.from('icd10_codes').upsert(chunk, { onConflict: 'code' });

    if (error) {
      console.error('importIcd10: upsert failed', { code: error.code, offset: start });

      return {
        ok: false,
        error: `Impor berhenti di baris ke-${start + 1}. Baris sebelumnya sudah tersimpan; coba impor ulang.`,
      };
    }
  }

  return {
    ok: true,
    data: { imported: parsed.rows.length, skipped: parsed.skipped.slice(0, 20), skippedCount: parsed.skipped.length },
  };
}

// Activity log -------------------------------------------------------------------

/**
 * One page of the audit log (newest first) with actor names. Jakarta dates.
 * The date range keeps the count and offset on the (clinic_id, created_at) index.
 */
export async function listAuditLogs(
  supabase: SupabaseClient,
  options: { range: DateRange; table: string | null; actor?: string | null; action?: string | null; page: number },
) {
  const from = (options.page - 1) * AUDIT_PAGE_SIZE;

  let request = supabase
    .from('audit_logs')
    .select('id, actor_id, action, table_name, record_id, before, after, created_at', { count: 'exact' })
    .gte('created_at', `${options.range.from}T00:00:00+07:00`)
    .lte('created_at', `${options.range.to}T23:59:59.999+07:00`);

  if (options.table) request = request.eq('table_name', options.table);

  if (options.actor)
    request = options.actor === 'system' ? request.is('actor_id', null) : request.eq('actor_id', options.actor);

  if (options.action) request = request.eq('action', options.action);

  // actor_id points at auth.users (no join through the API): the clinic's staff list is small, so it loads alongside.
  const [{ data, count, error }, staff] = await Promise.all([
    request.order('created_at', { ascending: false }).range(from, from + AUDIT_PAGE_SIZE - 1),
    supabase.from('profiles').select('id, full_name'),
  ]);

  if (error) throw new Error(`listAuditLogs failed: ${error.code}`);

  const names = new Map((staff.data ?? []).map((actor) => [actor.id, actor.full_name]));

  return {
    total: count ?? 0,
    logs: data.map((row) => ({ ...row, actorName: row.actor_id ? (names.get(row.actor_id) ?? 'Staf') : 'Sistem' })),
  };
}
