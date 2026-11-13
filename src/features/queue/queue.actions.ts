"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import { cancelVisitSchema, type CancelVisitValues } from "./queue.lib";
import { callVisit, cancelVisit, skipVisit, startExam } from "./queue.service";

const NOT_FOUND: ActionResult<never> = { ok: false, error: "Kunjungan tidak ditemukan. Muat ulang halaman." };
const isId = (value: string) => z.uuid().safeParse(value).success;

export async function callVisitAction(visitId: string): Promise<ActionResult> {
  await requireRole("doctor", "nurse", "admin", "owner");
  if (!isId(visitId)) return NOT_FOUND;
  return callVisit(await createClient(), visitId);
}

export async function skipVisitAction(visitId: string): Promise<ActionResult> {
  await requireRole("doctor", "nurse", "front_desk", "admin", "owner");
  if (!isId(visitId)) return NOT_FOUND;
  return skipVisit(await createClient(), visitId);
}

export async function startExamAction(visitId: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  return startExam(await createClient(), visitId);
}

export async function cancelVisitAction(visitId: string, input: CancelVisitValues): Promise<ActionResult> {
  await requireRole("front_desk", "admin", "owner");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = cancelVisitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Alasan tidak valid." };
  return cancelVisit(await createClient(), visitId, parsed.data.reason);
}
