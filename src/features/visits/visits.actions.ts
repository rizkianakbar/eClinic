"use server";

import { PATIENT_EDITOR_ROLES } from "@/features/patients/patients.constants";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import { createVisitSchema, type CreateVisitInput } from "./visits.lib";
import { createVisit } from "./visits.service";

export async function createVisitAction(input: CreateVisitInput): Promise<ActionResult<{ id: string; queueNo: number }>> {
  await requireRole(...PATIENT_EDITOR_ROLES);
  const parsed = createVisitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data kunjungan tidak valid." };
  return createVisit(await createClient(), parsed.data);
}
