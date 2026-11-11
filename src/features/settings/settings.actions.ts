"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  poliSchema,
  staffCreateSchema,
  staffPasswordSchema,
  staffSchema,
  type PoliInput,
  type StaffCreateInput,
  type StaffInput,
} from "./settings.lib";
import {
  createPoli,
  createStaff,
  resetStaffPassword,
  setStaffActive,
  updatePoli,
  updateStaff,
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
