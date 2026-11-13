import 'server-only';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import {
  type ConsumableValues,
  examErrorMessage,
  type ProcedureValues,
  type ReferralLetterValues,
  type SickLetterValues,
  type SoapValues,
  type VitalsValues,
} from './exam.lib';

const ok: ActionResult = { ok: true, data: undefined };

const fail = (error: { code?: string; message?: string; details?: string }): ActionResult<never> => ({
  ok: false,
  error: examErrorMessage(error),
});

// Reads ---------------------------------------------------------------------------

export async function getExamVisit(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('visits')
    .select(
      'id, status, queue_no, payer_type, visit_date, doctor_id, no_medicine_reason, patient:patients(id, full_name, mrn, birth_date, sex), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)',
    )
    .eq('id', visitId)
    .maybeSingle();

  if (error) throw new Error(`getExamVisit failed: ${error.code}`);

  return data;
}

export async function listVitals(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('vitals')
    .select('id, systolic, diastolic, pulse, temperature, respiratory_rate, spo2, weight, height, created_at')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listVitals failed: ${error.code}`);

  return data;
}

/** Main note first, then amendments in order. */
export async function listSoapNotes(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('soap_notes')
    .select('id, amends_id, subjective, objective, assessment, plan, signed_at, created_at, author:profiles(full_name)')
    .eq('visit_id', visitId)
    .order('created_at');

  if (error) throw new Error(`listSoapNotes failed: ${error.code}`);

  return {
    main: data.find((note) => note.amends_id === null) ?? null,
    amendments: data.filter((note) => note.amends_id !== null),
  };
}

export async function listDiagnoses(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('visit_diagnoses')
    .select('id, icd10_code, is_primary, icd10:icd10_codes(name, name_id)')
    .eq('visit_id', visitId)
    .order('is_primary', { ascending: false })
    .order('created_at');

  if (error) throw new Error(`listDiagnoses failed: ${error.code}`);

  return data;
}

/** Last visits of the patient with diagnoses and the signed assessment/plan. */
export async function listPreviousVisits(supabase: SupabaseClient, patientId: string, excludeVisitId: string) {
  const { data, error } = await supabase
    .from('visits')
    .select(
      'id, visit_date, poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name), diagnoses:visit_diagnoses(icd10_code, is_primary, icd10:icd10_codes(name, name_id)), notes:soap_notes(id, assessment, plan, amends_id, signed_at), prescriptions(items:prescription_items(qty, medicine:medicines(name, unit)))',
    )
    .eq('patient_id', patientId)
    .neq('id', excludeVisitId)
    .neq('status', 'cancelled')
    .order('visit_date', { ascending: false })
    .limit(5);

  if (error) throw new Error(`listPreviousVisits failed: ${error.code}`);

  return data;
}

// Writes (rules enforced by the exam triggers) -------------------------------------

export async function addVitals(supabase: SupabaseClient, visitId: string, values: VitalsValues) {
  const { error } = await supabase.from('vitals').insert({ ...values, visit_id: visitId });

  return error ? fail(error) : ok;
}

/** Creates the draft on first save, updates it afterwards. */
export async function saveSoapDraft(supabase: SupabaseClient, visitId: string, values: SoapValues) {
  const { data: existing, error: readError } = await supabase
    .from('soap_notes')
    .select('id')
    .eq('visit_id', visitId)
    .is('amends_id', null)
    .maybeSingle();

  if (readError) return fail(readError);

  const { error } = existing
    ? await supabase.from('soap_notes').update(values).eq('id', existing.id)
    : await supabase.from('soap_notes').insert({ ...values, visit_id: visitId });

  return error ? fail(error) : ok;
}

/** Saves the latest draft, then locks it and sends the patient on (sign_visit): pharmacy or cashier. */
export async function signVisit(
  supabase: SupabaseClient,
  visitId: string,
  values: SoapValues,
): Promise<ActionResult<{ status: 'to_pharmacy' | 'to_cashier' }>> {
  const saved = await saveSoapDraft(supabase, visitId, values);

  if (!saved.ok) return saved;

  const { data, error } = await supabase.rpc('sign_visit', { p_visit_id: visitId });

  if (error) return fail(error);

  return { ok: true, data: { status: data === 'to_pharmacy' ? 'to_pharmacy' : 'to_cashier' } };
}

export async function addAmendment(supabase: SupabaseClient, visitId: string, values: SoapValues) {
  const { data: main, error: readError } = await supabase
    .from('soap_notes')
    .select('id')
    .eq('visit_id', visitId)
    .is('amends_id', null)
    .maybeSingle();

  if (readError) return fail(readError);
  if (!main) return fail({ code: 'P0001', message: 'amend_target_invalid' });

  const { error } = await supabase.from('soap_notes').insert({ ...values, visit_id: visitId, amends_id: main.id });

  return error ? fail(error) : ok;
}

export async function addDiagnosis(supabase: SupabaseClient, visitId: string, icd10Code: string) {
  const { error } = await supabase.from('visit_diagnoses').insert({ visit_id: visitId, icd10_code: icd10Code });

  return error ? fail(error) : ok;
}

export async function setPrimaryDiagnosis(supabase: SupabaseClient, diagnosisId: string) {
  const { error } = await supabase.from('visit_diagnoses').update({ is_primary: true }).eq('id', diagnosisId);

  return error ? fail(error) : ok;
}

export async function removeDiagnosis(supabase: SupabaseClient, diagnosisId: string) {
  const { error } = await supabase.from('visit_diagnoses').delete().eq('id', diagnosisId);

  return error ? fail(error) : ok;
}

// Procedures --------------------------------------------------------------------

export async function listProcedures(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('visit_procedures')
    .select(
      'id, qty, price, service:services(name), performer:profiles!visit_procedures_performed_by_fkey(full_name), consumables:procedure_consumables(id, qty, medicine:medicines(name, unit, price))',
    )
    .eq('visit_id', visitId)
    .order('created_at');

  if (error) throw new Error(`listProcedures failed: ${error.code}`);

  return data;
}

/** Active services a doctor can record as a procedure, and who can perform them. */
export async function listProcedureOptions(supabase: SupabaseClient) {
  const [services, performers] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price')
      .eq('is_active', true)
      .in('type', ['procedure', 'other'])
      .order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true)
      .in('role', ['doctor', 'nurse'])
      .order('full_name'),
  ]);

  if (services.error) throw new Error(`listProcedureOptions failed: ${services.error.code}`);
  if (performers.error) throw new Error(`listProcedureOptions failed: ${performers.error.code}`);

  return { services: services.data, performers: performers.data };
}

export async function addProcedure(supabase: SupabaseClient, visitId: string, values: ProcedureValues) {
  const { error } = await supabase.from('visit_procedures').insert({ ...values, visit_id: visitId });

  return error ? fail(error) : ok;
}

export async function removeProcedure(supabase: SupabaseClient, procedureId: string) {
  const { error } = await supabase.from('visit_procedures').delete().eq('id', procedureId);

  return error ? fail(error) : ok;
}

// Letters -----------------------------------------------------------------------------

export async function listLetters(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('medical_letters')
    .select('id, type, letter_no, rest_from, rest_days, destination, created_at')
    .eq('visit_id', visitId)
    .order('created_at');

  if (error) throw new Error(`listLetters failed: ${error.code}`);

  return data;
}

export async function createSickLetter(supabase: SupabaseClient, visitId: string, values: SickLetterValues) {
  const { data, error } = await supabase
    .from('medical_letters')
    .insert({ ...values, visit_id: visitId, type: 'sick' })
    .select('id')
    .single();

  return error ? fail(error) : ({ ok: true, data: { id: data.id } } as const);
}

export async function createReferralLetter(supabase: SupabaseClient, visitId: string, values: ReferralLetterValues) {
  const { data, error } = await supabase
    .from('medical_letters')
    .insert({ ...values, visit_id: visitId, type: 'referral' })
    .select('id')
    .single();

  return error ? fail(error) : ({ ok: true, data: { id: data.id } } as const);
}

/** Everything a printed letter needs: letter, patient, doctor (SIP), primary diagnosis. */
export async function getLetter(supabase: SupabaseClient, letterId: string) {
  const { data, error } = await supabase
    .from('medical_letters')
    .select(
      '*, doctor:profiles!medical_letters_created_by_fkey(full_name, sip_number), visit:visits(visit_date, patient:patients(full_name, mrn, birth_date, sex, address, nik), diagnoses:visit_diagnoses(icd10_code, is_primary, icd10:icd10_codes(name, name_id)))',
    )
    .eq('id', letterId)
    .maybeSingle();

  if (error) throw new Error(`getLetter failed: ${error.code}`);

  return data;
}

export async function addConsumable(supabase: SupabaseClient, procedureId: string, values: ConsumableValues) {
  const { error } = await supabase.from('procedure_consumables').insert({ ...values, visit_procedure_id: procedureId });

  if (error?.code === '23505') return { ok: false, error: 'exam.errors.consumableDuplicate' } as const;

  return error ? fail(error) : ok;
}

export async function removeConsumable(supabase: SupabaseClient, consumableId: string) {
  const { error } = await supabase.from('procedure_consumables').delete().eq('id', consumableId);

  return error ? fail(error) : ok;
}
