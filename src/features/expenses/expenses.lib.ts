import { z } from "zod";
import { rupiahField } from "@/lib/money";

/** Suggestions only; any short category is allowed. */
export const EXPENSE_CATEGORIES = ["Gaji", "Listrik", "Air", "Sewa", "Internet", "ATK", "Kebersihan", "Perawatan alat", "Lainnya"] as const;

export function expenseSchema(today: string) {
  return z.object({
    expense_date: z
      .string()
      .min(1, "Tanggal wajib diisi.")
      .pipe(z.iso.date("Tanggal tidak valid."))
      .refine((value) => value <= today, "Tanggal tidak boleh di masa depan."),
    category: z.string().trim().min(1, "Kategori wajib diisi.").max(50, "Kategori maksimal 50 karakter."),
    description: z
      .string()
      .nullish()
      .transform((value) => (value ?? "").trim())
      .refine((value) => value.length <= 200, "Keterangan maksimal 200 karakter.")
      .transform((value) => value || null),
    amount: rupiahField("Jumlah").refine((value) => value > 0, "Jumlah harus lebih dari 0."),
  });
}

export type ExpenseInput = z.input<ReturnType<typeof expenseSchema>>;
export type ExpenseValues = z.output<ReturnType<typeof expenseSchema>>;

export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(1, "Alasan pembatalan wajib diisi.").max(200, "Alasan maksimal 200 karakter."),
});

export type VoidExpenseValues = z.output<typeof voidExpenseSchema>;

export function expenseErrorMessage(error: { code?: string; message?: string }) {
  if (error.message === "void_reason_required") return "Alasan pembatalan wajib diisi.";
  if (error.message === "expense_locked") return "Pengeluaran ini sudah dibatalkan.";
  if (error.code === "42501") return "Hanya pemilik klinik yang bisa mencatat pengeluaran.";
  return "Pengeluaran gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.";
}

type ExpenseRow = { expense_date: string; category: string; amount: number; status: string };

/**
 * A period's expenses: active total and count, totals per category (largest
 * first) and the entries grouped per day (newest first, with each day's
 * active subtotal). Voided entries stay listed but never count.
 */
export function expenseSummary<T extends ExpenseRow>(expenses: readonly T[]) {
  const active = expenses.filter((item) => item.status === "active");
  const categories = new Map<string, { category: string; total: number; count: number }>();
  for (const item of active) {
    const entry = categories.get(item.category) ?? { category: item.category, total: 0, count: 0 };
    categories.set(item.category, { ...entry, total: entry.total + item.amount, count: entry.count + 1 });
  }
  const days = new Map<string, { day: string; total: number; items: T[] }>();
  for (const item of expenses) {
    const entry = days.get(item.expense_date) ?? { day: item.expense_date, total: 0, items: [] };
    entry.items.push(item);
    if (item.status === "active") entry.total += item.amount;
    days.set(item.expense_date, entry);
  }
  return {
    total: active.reduce((sum, item) => sum + item.amount, 0),
    count: active.length,
    voided: expenses.length - active.length,
    byCategory: [...categories.values()].sort((a, b) => b.total - a.total),
    byDay: [...days.values()].sort((a, b) => b.day.localeCompare(a.day)),
  };
}
