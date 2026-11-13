"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { todayInJakarta } from "@/lib/dates";
import type { ActionResult } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import {
  amendmentSchema,
  consumableSchema,
  procedureSchema,
  referralLetterSchema,
  sickLetterSchema,
  soapSchema,
  vitalsSchema,
  type ConsumableValues,
  type ProcedureInput,
  type ReferralLetterInput,
  type SickLetterInput,
  type SoapInput,
  type VitalsInput,
} from "./exam.lib";
import {
  addAmendment,
  addConsumable,
  addDiagnosis,
  addProcedure,
  addVitals,
  createReferralLetter,
  createSickLetter,
  removeConsumable,
  removeProcedure,
  removeDiagnosis,
  saveSoapDraft,
  setPrimaryDiagnosis,
  signVisit,
} from "./exam.service";

const NOT_FOUND: ActionResult<never> = { ok: false, error: "Data tidak ditemukan. Muat ulang halaman." };
const isId = (value: string) => z.uuid().safeParse(value).success;

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: error.issues[0]?.message ?? "Data tidak valid." };
}

export async function addVitalsAction(visitId: string, input: VitalsInput): Promise<ActionResult> {
  await requireRole("doctor", "nurse");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = vitalsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return addVitals(await createClient(), visitId, parsed.data);
}

export async function saveSoapDraftAction(visitId: string, input: SoapInput): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = soapSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return saveSoapDraft(await createClient(), visitId, parsed.data);
}

export async function signVisitAction(
  visitId: string,
  input: SoapInput,
): Promise<ActionResult<{ status: "to_pharmacy" | "to_cashier" }>> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = soapSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return signVisit(await createClient(), visitId, parsed.data);
}

export async function addAmendmentAction(visitId: string, input: SoapInput): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = amendmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return addAmendment(await createClient(), visitId, parsed.data);
}

export async function addDiagnosisAction(visitId: string, icd10Code: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(visitId) || !/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/.test(icd10Code)) return NOT_FOUND;
  return addDiagnosis(await createClient(), visitId, icd10Code);
}

export async function setPrimaryDiagnosisAction(diagnosisId: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(diagnosisId)) return NOT_FOUND;
  return setPrimaryDiagnosis(await createClient(), diagnosisId);
}

export async function removeDiagnosisAction(diagnosisId: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(diagnosisId)) return NOT_FOUND;
  return removeDiagnosis(await createClient(), diagnosisId);
}

export async function addProcedureAction(visitId: string, input: ProcedureInput): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return addProcedure(await createClient(), visitId, parsed.data);
}

export async function removeProcedureAction(procedureId: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(procedureId)) return NOT_FOUND;
  return removeProcedure(await createClient(), procedureId);
}

export async function createSickLetterAction(visitId: string, input: SickLetterInput): Promise<ActionResult<{ id: string }>> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = sickLetterSchema(todayInJakarta()).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return createSickLetter(await createClient(), visitId, parsed.data);
}

export async function createReferralLetterAction(
  visitId: string,
  input: ReferralLetterInput,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("doctor");
  if (!isId(visitId)) return NOT_FOUND;
  const parsed = referralLetterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return createReferralLetter(await createClient(), visitId, parsed.data);
}

export async function addConsumableAction(procedureId: string, input: ConsumableValues): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(procedureId)) return NOT_FOUND;
  const parsed = consumableSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return addConsumable(await createClient(), procedureId, parsed.data);
}

export async function removeConsumableAction(consumableId: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!isId(consumableId)) return NOT_FOUND;
  return removeConsumable(await createClient(), consumableId);
}
