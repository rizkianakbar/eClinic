import "server-only";
import type { DateRange } from "@/features/reports/reports.lib";
import type { ActionResult } from "@/lib/query";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { SupabaseClient } from "@/lib/supabase/server";
import { expenseErrorMessage, type ExpenseValues } from "./expenses.lib";

export async function listExpenses(supabase: SupabaseClient, range: DateRange) {
  // The category totals are computed from this list: it must hold every expense in the range.
  return fetchAll("listExpenses", (from, to) =>
    supabase
      .from("expenses")
      .select("id, expense_date, category, description, amount, status, void_reason, creator:profiles!expenses_created_by_fkey(full_name)")
      .gte("expense_date", range.from)
      .lte("expense_date", range.to)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
}

export async function createExpense(supabase: SupabaseClient, values: ExpenseValues): Promise<ActionResult> {
  const { error } = await supabase.from("expenses").insert(values);
  return error ? { ok: false, error: expenseErrorMessage(error) } : { ok: true, data: undefined };
}

export async function voidExpense(supabase: SupabaseClient, expenseId: string, reason: string): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("expenses")
    .update({ status: "void", void_reason: reason })
    .eq("id", expenseId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: expenseErrorMessage(error) };
  return data ? { ok: true, data: undefined } : { ok: false, error: "Pengeluaran tidak ditemukan. Muat ulang halaman." };
}
