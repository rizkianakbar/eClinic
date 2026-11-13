import 'server-only';
import { examErrorMessage } from '@/features/exam/exam.lib';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import type { CompoundValues, PrescriptionItemValues } from './prescriptions.lib';

const ok: ActionResult = { ok: true, data: undefined };

const fail = (error: { code?: string; message?: string }): ActionResult<never> => ({
  ok: false,
  error: examErrorMessage(error),
});

/** Regular items and racikan of a visit's prescription (empty when none yet). */
export async function getPrescription(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(
      'id, items:prescription_items(id, compound_id, qty, signa, created_at, medicine:medicines(id, name, unit, price)), compounds:prescription_compounds(id, form, quantity, signa)',
    )
    .eq('visit_id', visitId)
    .maybeSingle();

  if (error) throw new Error(`getPrescription failed: ${error.code}`);

  const items = data?.items ?? [];

  return {
    items: items.filter((item) => item.compound_id === null),
    compounds: (data?.compounds ?? []).map((compound) => ({
      ...compound,
      ingredients: items.filter((item) => item.compound_id === compound.id),
    })),
  };
}

/** The visit's prescription id, created on first use. */
async function ensurePrescription(supabase: SupabaseClient, visitId: string) {
  const { data: existing, error } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('visit_id', visitId)
    .maybeSingle();

  if (error) return { error };
  if (existing) return { id: existing.id };

  const { data: created, error: insertError } = await supabase
    .from('prescriptions')
    .insert({ visit_id: visitId })
    .select('id')
    .single();

  return insertError ? { error: insertError } : { id: created.id };
}

export async function addPrescriptionItem(supabase: SupabaseClient, visitId: string, values: PrescriptionItemValues) {
  const prescription = await ensurePrescription(supabase, visitId);

  if (!prescription.id) return fail(prescription.error ?? {});

  const { error } = await supabase.from('prescription_items').insert({ ...values, prescription_id: prescription.id });

  return error ? fail(error) : ok;
}

/** Creates the racikan, then its ingredients; removes the racikan again if an ingredient is refused. */
export async function addCompound(supabase: SupabaseClient, visitId: string, values: CompoundValues) {
  const prescription = await ensurePrescription(supabase, visitId);

  if (!prescription.id) return fail(prescription.error ?? {});

  const { ingredients, ...compound } = values;

  const { data, error } = await supabase
    .from('prescription_compounds')
    .insert({ ...compound, prescription_id: prescription.id })
    .select('id')
    .single();

  if (error) return fail(error);

  const { error: itemsError } = await supabase
    .from('prescription_items')
    .insert(
      ingredients.map((ingredient) => ({ ...ingredient, prescription_id: prescription.id, compound_id: data.id })),
    );

  if (itemsError) {
    await supabase.from('prescription_compounds').delete().eq('id', data.id);

    return fail(itemsError);
  }

  return ok;
}

export async function removePrescriptionItem(supabase: SupabaseClient, itemId: string) {
  const { error } = await supabase.from('prescription_items').delete().eq('id', itemId);

  return error ? fail(error) : ok;
}

export async function removeCompound(supabase: SupabaseClient, compoundId: string) {
  const { error } = await supabase.from('prescription_compounds').delete().eq('id', compoundId);

  return error ? fail(error) : ok;
}

/**
 * Records (or with null, withdraws) the doctor's decision that this visit needs no medicine. The database
 * allows it only for the visit's own doctor during the exam, and signing requires it when nothing is prescribed.
 */
export async function setNoMedicine(supabase: SupabaseClient, visitId: string, reason: string | null) {
  const { data, error } = await supabase
    .from('visits')
    .update({ no_medicine_reason: reason })
    .eq('id', visitId)
    .select('id')
    .maybeSingle();

  if (error) return fail(error);

  return data ? ok : fail({ code: 'P0001', message: 'not_your_patient' });
}
