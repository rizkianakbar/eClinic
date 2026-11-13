import "server-only";
import { todayInJakarta } from "@/lib/dates";
import type { ActionResult } from "@/lib/query";
import type { SupabaseClient } from "@/lib/supabase/server";
import { availableFromBatches, pharmacyErrorMessage, type DispenseValues, type StockBatch } from "./pharmacy.lib";

const VISIT_SELECT =
  "id, status, queue_no, payer_type, visit_date, updated_at, patient:patients(full_name, mrn, birth_date, sex), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)";

/** Visits waiting at the pharmacy, oldest first. */
export async function listPharmacyQueue(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("visits")
    .select(VISIT_SELECT)
    .eq("status", "to_pharmacy")
    .order("updated_at");
  if (error) throw new Error(`listPharmacyQueue failed: ${error.code}`);
  return data;
}

/** Today's dispensed prescriptions, newest first (for reprinting labels). */
export async function listDispensedToday(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("dispensations")
    .select("id, dispensed_at, items:dispense_items(status), dispenser:profiles(full_name), visit:visits(id, queue_no, payer_type, patient:patients(full_name, mrn))")
    .gte("dispensed_at", `${todayInJakarta()}T00:00:00+07:00`)
    .order("dispensed_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`listDispensedToday failed: ${error.code}`);
  return data;
}

export async function getPharmacyVisit(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase.from("visits").select(VISIT_SELECT).eq("id", visitId).maybeSingle();
  if (error) throw new Error(`getPharmacyVisit failed: ${error.code}`);
  return data;
}

/** Usable batches (unexpired, in stock) of these medicines, earliest expiry first. */
export async function listUsableBatches(supabase: SupabaseClient, medicineIds: string[]): Promise<StockBatch[]> {
  if (medicineIds.length === 0) return [];
  const { data, error } = await supabase
    .from("stock_batches")
    .select("id, medicine_id, batch_no, expiry_date, qty_on_hand, created_at")
    .in("medicine_id", [...new Set(medicineIds)])
    .gt("qty_on_hand", 0)
    .gt("expiry_date", todayInJakarta())
    .order("expiry_date");
  if (error) throw new Error(`listUsableBatches failed: ${error.code}`);
  return data;
}

/** Usable stock (unexpired batches) per medicine. */
export async function availableStock(supabase: SupabaseClient, medicineIds: string[]) {
  return availableFromBatches(await listUsableBatches(supabase, medicineIds));
}

/** What was given (per batch) and not given, keyed by prescription item. */
export async function getDispensation(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from("dispensations")
    .select(
      "id, dispensed_at, dispenser:profiles(full_name), items:dispense_items(prescription_item_id, qty, status, not_given_reason, unit_price, batch:stock_batches(batch_no, expiry_date))",
    )
    .eq("visit_id", visitId)
    .maybeSingle();
  if (error) throw new Error(`getDispensation failed: ${error.code}`);
  return data;
}

export async function getClinicName(supabase: SupabaseClient) {
  const { data } = await supabase.from("clinics").select("name, address, phone").maybeSingle();
  return data;
}

/** Atomic in the database: FEFO stock deduction, dispense records, visit -> cashier. */
export async function dispense(
  supabase: SupabaseClient,
  visitId: string,
  values: DispenseValues,
): Promise<ActionResult> {
  const { error } = await supabase.rpc("dispense_prescription", {
    p_visit_id: visitId,
    p_not_given: values.not_given,
  });
  return error ? { ok: false, error: pharmacyErrorMessage(error) } : { ok: true, data: undefined };
}
