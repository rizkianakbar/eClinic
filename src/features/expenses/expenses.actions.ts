'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { type ExpenseInput, expenseSchema, type VoidExpenseValues, voidExpenseSchema } from './expenses.lib';
import { createExpense, voidExpense } from './expenses.service';

export async function createExpenseAction(input: ExpenseInput): Promise<ActionResult> {
  await requireRole('owner');

  const parsed = expenseSchema(todayInJakarta()).safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return createExpense(await createClient(), parsed.data);
}

export async function voidExpenseAction(expenseId: string, input: VoidExpenseValues): Promise<ActionResult> {
  await requireRole('owner');
  if (!z.uuid().safeParse(expenseId).success) return { ok: false, error: 'expenses.errors.notFound' };

  const parsed = voidExpenseSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return voidExpense(await createClient(), expenseId, parsed.data.reason);
}
