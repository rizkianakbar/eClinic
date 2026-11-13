import { z } from 'zod';
import { rupiahField } from '@/lib/money';

/** Suggestions only; any short category is allowed. Stored as written (Bahasa), shown translated when known. */
export const EXPENSE_CATEGORIES = [
  'Gaji',
  'Listrik',
  'Air',
  'Sewa',
  'Internet',
  'ATK',
  'Kebersihan',
  'Perawatan alat',
  'Lainnya',
] as const;

export function expenseSchema(today: string) {
  return z.object({
    expense_date: z
      .string()
      .min(1, 'expenses.errors.dateRequired')
      .pipe(z.iso.date('expenses.errors.dateInvalid'))
      .refine((value) => value <= today, 'expenses.errors.dateFuture'),
    category: z.string().trim().min(1, 'expenses.errors.categoryRequired').max(50, 'expenses.errors.categoryTooLong'),
    description: z
      .string()
      .nullish()
      .transform((value) => (value ?? '').trim())
      .refine((value) => value.length <= 200, 'expenses.errors.descriptionTooLong')
      .transform((value) => value || null),
    amount: rupiahField().refine((value) => value > 0, 'expenses.errors.amountPositive'),
  });
}

export type ExpenseInput = z.input<ReturnType<typeof expenseSchema>>;
export type ExpenseValues = z.output<ReturnType<typeof expenseSchema>>;

export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(1, 'expenses.errors.voidReasonRequired').max(200, 'expenses.errors.reasonTooLong'),
});

export type VoidExpenseValues = z.output<typeof voidExpenseSchema>;

/** Maps an expense write error to a message key. */
export function expenseErrorMessage(error: { code?: string; message?: string }) {
  if (error.message === 'void_reason_required') return 'expenses.errors.voidReasonRequired';
  if (error.message === 'expense_locked') return 'expenses.errors.locked';
  if (error.code === '42501') return 'expenses.errors.ownerOnly';

  return 'expenses.errors.saveFailed';
}

type ExpenseRow = { expense_date: string; category: string; amount: number; status: string };

/**
 * A period's expenses: active total and count, totals per category (largest
 * first) and the entries grouped per day (newest first, with each day's
 * active subtotal). Voided entries stay listed but never count.
 */
export function expenseSummary<T extends ExpenseRow>(expenses: readonly T[]) {
  const active = expenses.filter((item) => item.status === 'active');
  const categories = new Map<string, { category: string; total: number; count: number }>();

  for (const item of active) {
    const entry = categories.get(item.category) ?? { category: item.category, total: 0, count: 0 };

    categories.set(item.category, { ...entry, total: entry.total + item.amount, count: entry.count + 1 });
  }

  const days = new Map<string, { day: string; total: number; items: T[] }>();

  for (const item of expenses) {
    const entry = days.get(item.expense_date) ?? { day: item.expense_date, total: 0, items: [] };

    entry.items.push(item);
    if (item.status === 'active') entry.total += item.amount;
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
