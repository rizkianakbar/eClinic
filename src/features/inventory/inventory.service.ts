import "server-only";
import { masterDataErrorMessage } from "@/features/settings/settings.lib";
import type { ActionResult } from "@/lib/query";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { SupabaseClient } from "@/lib/supabase/server";
import { escapeLike } from "@/features/patients/patients.lib";
import {
  MEDICINES_PAGE_SIZE,
  stockErrorMessage,
  type MedicineValues,
  type OpnameValues,
  type PurchasePayload,
  type StockFilter,
  type SupplierValues,
} from "./inventory.lib";

const ok: ActionResult = { ok: true, data: undefined };

// Medicines -------------------------------------------------------------------

/** One page of medicines (active first), optionally filtered by name. */
export async function listMedicines(supabase: SupabaseClient, options: { query: string; page: number }) {
  const from = (options.page - 1) * MEDICINES_PAGE_SIZE;
  let request = supabase
    .from("medicines")
    .select("id, name, unit, price, kfa_code, min_stock, is_active", { count: "exact" });
  if (options.query) request = request.ilike("name", `%${escapeLike(options.query)}%`);
  const { data, count, error } = await request
    .order("is_active", { ascending: false })
    .order("name")
    .range(from, from + MEDICINES_PAGE_SIZE - 1);
  if (error) throw new Error(`listMedicines failed: ${error.code}`);
  return { medicines: data, total: count ?? 0 };
}

const DUPLICATE_MEDICINE = "Nama obat ini sudah ada. Gunakan nama lain atau ubah obat yang sudah ada.";

export async function createMedicine(supabase: SupabaseClient, values: MedicineValues): Promise<ActionResult> {
  const { error } = await supabase.from("medicines").insert(values);
  return error ? { ok: false, error: masterDataErrorMessage(error, DUPLICATE_MEDICINE) } : ok;
}

export async function updateMedicine(
  supabase: SupabaseClient,
  medicineId: string,
  values: Partial<MedicineValues> & { is_active?: boolean },
): Promise<ActionResult> {
  const { data, error } = await supabase.from("medicines").update(values).eq("id", medicineId).select("id").maybeSingle();
  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_MEDICINE) };
  return data ? ok : { ok: false, error: "Obat tidak ditemukan. Muat ulang halaman." };
}

// Suppliers -------------------------------------------------------------------

export async function listSuppliers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, phone, address, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw new Error(`listSuppliers failed: ${error.code}`);
  return data;
}

const DUPLICATE_SUPPLIER = "Nama supplier ini sudah ada.";

export async function createSupplier(supabase: SupabaseClient, values: SupplierValues): Promise<ActionResult> {
  const { error } = await supabase.from("suppliers").insert(values);
  return error ? { ok: false, error: masterDataErrorMessage(error, DUPLICATE_SUPPLIER) } : ok;
}

export async function updateSupplier(
  supabase: SupabaseClient,
  supplierId: string,
  values: Partial<SupplierValues> & { is_active?: boolean },
): Promise<ActionResult> {
  const { data, error } = await supabase.from("suppliers").update(values).eq("id", supplierId).select("id").maybeSingle();
  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_SUPPLIER) };
  return data ? ok : { ok: false, error: "Supplier tidak ditemukan. Muat ulang halaman." };
}

// Stock --------------------------------------------------------------------------

const PAGE_SIZE = MEDICINES_PAGE_SIZE;

/** Stock per active medicine, filtered and paginated. `cutoff` = last near-expiry date. */
export async function listStock(
  supabase: SupabaseClient,
  options: { filter: StockFilter; query: string; page: number; cutoff: string },
) {
  const from = (options.page - 1) * PAGE_SIZE;
  let request = supabase
    .from("medicine_stock")
    .select("medicine_id, name, unit, min_stock, qty_on_hand, earliest_expiry", { count: "exact" })
    .eq("is_active", true);
  if (options.query) request = request.ilike("name", `%${escapeLike(options.query)}%`);
  if (options.filter === "low") request = request.eq("is_low", true);
  if (options.filter === "expiring") request = request.lte("earliest_expiry", options.cutoff);
  const { data, count, error } = await request
    .order(options.filter === "expiring" ? "earliest_expiry" : "name")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`listStock failed: ${error.code}`);

  return {
    total: count ?? 0,
    stock: data.map((row) => ({
      medicineId: row.medicine_id!,
      name: row.name ?? "",
      unit: row.unit ?? "",
      minStock: row.min_stock ?? 0,
      qtyOnHand: row.qty_on_hand ?? 0,
      earliestExpiry: row.earliest_expiry,
    })),
  };
}

/** Counts for the alert badges. */
export async function countStockAlerts(supabase: SupabaseClient, cutoff: string) {
  const [low, expiring] = await Promise.all([
    supabase.from("medicine_stock").select("medicine_id", { count: "exact", head: true }).eq("is_active", true).eq("is_low", true),
    supabase
      .from("medicine_stock")
      .select("medicine_id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("earliest_expiry", cutoff),
  ]);
  if (low.error || expiring.error) throw new Error("countStockAlerts failed");
  return { low: low.count ?? 0, expiring: expiring.count ?? 0 };
}

export async function getMedicineStock(supabase: SupabaseClient, medicineId: string) {
  const [stock, batches] = await Promise.all([
    supabase.from("medicine_stock").select("name, unit, min_stock, qty_on_hand").eq("medicine_id", medicineId).maybeSingle(),
    supabase
      .from("stock_batches")
      .select("id, batch_no, expiry_date, qty_on_hand, unit_cost")
      .eq("medicine_id", medicineId)
      .gt("qty_on_hand", 0)
      .order("expiry_date"),
  ]);
  if (stock.error || batches.error) throw new Error("getMedicineStock failed");
  return stock.data ? { ...stock.data, batches: batches.data } : null;
}

/** Kartu stok, newest first, with the running balance from the view. */
export async function listStockCard(supabase: SupabaseClient, medicineId: string, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("stock_card")
    .select("id, created_at, type, qty, balance, batch_no, expiry_date, created_by_name", { count: "exact" })
    .eq("medicine_id", medicineId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`listStockCard failed: ${error.code}`);
  return { movements: data, total: count ?? 0 };
}

// Purchases ----------------------------------------------------------------------

export async function listPurchases(supabase: SupabaseClient, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("purchases")
    .select("id, invoice_no, purchase_date, total, supplier:suppliers(name), items:purchase_items(count)", {
      count: "exact",
    })
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`listPurchases failed: ${error.code}`);
  return { purchases: data, total: count ?? 0 };
}

export async function getPurchase(supabase: SupabaseClient, purchaseId: string) {
  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, invoice_no, purchase_date, total, note, created_at, supplier:suppliers(name), creator:profiles(full_name), items:purchase_items(id, batch_no, expiry_date, qty, unit_cost, subtotal, medicine:medicines(id, name, unit))",
    )
    .eq("id", purchaseId)
    .maybeSingle();
  if (error) throw new Error(`getPurchase failed: ${error.code}`);
  return data;
}

export async function listActiveSuppliers(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("suppliers").select("id, name").eq("is_active", true).order("name");
  if (error) throw new Error(`listActiveSuppliers failed: ${error.code}`);
  return data;
}

/** Atomic in the database: purchase, batches and stock movements, or nothing. */
export async function receivePurchase(
  supabase: SupabaseClient,
  payload: PurchasePayload,
): Promise<ActionResult<{ id: string }>> {
  const { data, error } = await supabase.rpc("receive_purchase", {
    p_supplier_id: payload.supplier_id,
    p_invoice_no: payload.invoice_no ?? "",
    p_purchase_date: payload.purchase_date,
    p_note: payload.note ?? "",
    p_items: payload.items,
  });
  if (error) return { ok: false, error: stockErrorMessage(error) };
  return { ok: true, data: { id: data } };
}

// Stock opname -------------------------------------------------------------------

/** Every batch with stock (expired ones included: opname is where they are written off). */
export async function listOpnameBatches(supabase: SupabaseClient) {
  // Every batch in stock must be on the count sheet, so page past the 1000-row cap.
  const data = await fetchAll("listOpnameBatches", (from, to) =>
    supabase
      .from("stock_batches")
      .select("id, batch_no, expiry_date, qty_on_hand, medicine:medicines(name, unit)")
      .gt("qty_on_hand", 0)
      .order("expiry_date")
      .order("id")
      .range(from, to),
  );
  return data.sort((a, b) => (a.medicine?.name ?? "").localeCompare(b.medicine?.name ?? "", "id"));
}

export async function postStockOpname(supabase: SupabaseClient, values: OpnameValues): Promise<ActionResult<{ id: string }>> {
  const { data, error } = await supabase.rpc("post_stock_opname", { p_note: values.note ?? "", p_items: values.items });
  if (error) return { ok: false, error: stockErrorMessage(error) };
  return { ok: true, data: { id: data } };
}

export async function listStockOpnames(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("stock_opnames")
    .select("id, opname_date, note, created_at, poster:profiles(full_name), items:stock_opname_items(difference)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`listStockOpnames failed: ${error.code}`);
  return data;
}

export async function getStockOpname(supabase: SupabaseClient, opnameId: string) {
  const { data, error } = await supabase
    .from("stock_opnames")
    .select(
      "id, opname_date, note, created_at, poster:profiles(full_name), items:stock_opname_items(id, system_qty, counted_qty, difference, reason, batch:stock_batches(batch_no, expiry_date), medicine:medicines(name, unit))",
    )
    .eq("id", opnameId)
    .maybeSingle();
  if (error) throw new Error(`getStockOpname failed: ${error.code}`);
  return data;
}

/**
 * Headline numbers for the stock pages: active medicines, stock value at purchase cost, and the two
 * alerts. One database call (`stock_summary`), computed over every batch.
 */
export async function getStockSummary(supabase: SupabaseClient, cutoff: string) {
  const { data, error } = await supabase.rpc("stock_summary", { p_cutoff: cutoff }).single();
  if (error) throw new Error(`getStockSummary failed: ${error.code}`);
  return data;
}

/** Purchases since `since` ("YYYY-MM-DD"): how many invoices and how much was spent. */
export async function getPurchaseMonth(supabase: SupabaseClient, since: string) {
  const { data, error } = await supabase.from("purchases").select("total").gte("purchase_date", since);
  if (error) throw new Error(`getPurchaseMonth failed: ${error.code}`);
  return { count: data.length, total: data.reduce((sum, purchase) => sum + purchase.total, 0) };
}
