"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  clinicProfileSchema,
  logoFileError,
  poliSchema,
  staffCreateSchema,
  staffPasswordSchema,
  staffSchema,
  type ClinicProfileInput,
  type PoliInput,
  type StaffCreateInput,
  type StaffInput,
} from "./settings.lib";
import {
  createPoli,
  createStaff,
  importIcd10,
  removeClinicLogo,
  resetStaffPassword,
  setStaffActive,
  updateClinicProfile,
  updatePoli,
  updateStaff,
  uploadClinicLogo,
} from "./settings.service";

const MANAGERS = ["owner", "admin"] as const;
const id = z.uuid();

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: error.issues[0]?.message ?? "Data tidak valid." };
}

const NOT_FOUND: ActionResult<never> = { ok: false, error: "Data tidak ditemukan. Muat ulang halaman." };

export async function createStaffAction(input: StaffCreateInput): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  const parsed = staffCreateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return createStaff(await createClient(), createAdminClient(), session, parsed.data);
}

export async function updateStaffAction(staffId: string, input: StaffInput): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  if (!id.safeParse(staffId).success) return NOT_FOUND;
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return updateStaff(await createClient(), session, staffId, parsed.data);
}

export async function setStaffActiveAction(staffId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  if (!id.safeParse(staffId).success) return NOT_FOUND;
  return setStaffActive(await createClient(), createAdminClient(), session, staffId, isActive === true);
}

export async function resetStaffPasswordAction(staffId: string, password: string): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  if (!id.safeParse(staffId).success) return NOT_FOUND;
  const parsed = staffPasswordSchema.safeParse({ password });
  if (!parsed.success) return invalid(parsed.error);
  return resetStaffPassword(await createClient(), createAdminClient(), session, staffId, parsed.data.password);
}

export async function createPoliAction(input: PoliInput): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  const parsed = poliSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return createPoli(await createClient(), session.clinicId, parsed.data);
}

export async function updatePoliAction(poliId: string, input: PoliInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!id.safeParse(poliId).success) return NOT_FOUND;
  const parsed = poliSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return updatePoli(await createClient(), poliId, parsed.data);
}

export async function setPoliActiveAction(poliId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!id.safeParse(poliId).success) return NOT_FOUND;
  return updatePoli(await createClient(), poliId, { is_active: isActive === true });
}

export async function updateClinicProfileAction(input: ClinicProfileInput): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  const parsed = clinicProfileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return updateClinicProfile(await createClient(), session.clinicId, parsed.data);
}

export async function uploadClinicLogoAction(formData: FormData): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file logo." };
  const fileError = logoFileError(file);
  if (fileError) return { ok: false, error: fileError };
  return uploadClinicLogo(await createClient(), session.clinicId, file);
}

export async function removeClinicLogoAction(): Promise<ActionResult> {
  const session = await requireRole(...MANAGERS);
  return removeClinicLogo(await createClient(), session.clinicId);
}

const ICD10_MAX_BYTES = 4 * 1024 * 1024;

export async function importIcd10Action(formData: FormData) {
  await requireRole(...MANAGERS);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Pilih file ICD-10." };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { ok: false as const, error: "File harus Excel (.xlsx) atau CSV." };
  if (file.size > ICD10_MAX_BYTES) return { ok: false as const, error: "Ukuran file maksimal 4 MB." };
  return importIcd10(createAdminClient(), file);
}
