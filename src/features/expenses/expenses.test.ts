import { describe, expect, it } from 'vitest';
import { expenseSchema, expenseSummary } from './expenses.lib';

describe('expenseSchema', () => {
  const schema = expenseSchema('2026-11-12');

  it('parses an expense', () => {
    expect(
      schema.parse({ expense_date: '2026-11-12', category: ' Listrik ', description: '', amount: 'Rp 1.250.000' }),
    ).toEqual({
      expense_date: '2026-11-12',
      category: 'Listrik',
      description: null,
      amount: 1250000,
    });
  });

  it('refuses future dates and zero amounts', () => {
    expect(
      schema.safeParse({ expense_date: '2026-11-13', category: 'A', description: '', amount: '1' }).error?.issues[0]
        ?.message,
    ).toBe('Tanggal tidak boleh di masa depan.');

    expect(
      schema.safeParse({ expense_date: '2026-11-12', category: 'A', description: '', amount: '0' }).error?.issues[0]
        ?.message,
    ).toBe('Jumlah harus lebih dari 0.');
  });
});

describe('expenseSummary', () => {
  it('totals active entries per category and per day, listing voids without counting them', () => {
    const summary = expenseSummary([
      { expense_date: '2026-11-12', category: 'Listrik', amount: 500_000, status: 'active' },
      { expense_date: '2026-11-12', category: 'ATK', amount: 150_000, status: 'active' },
      { expense_date: '2026-11-10', category: 'Listrik', amount: 100_000, status: 'active' },
      { expense_date: '2026-11-10', category: 'Sewa', amount: 9_000_000, status: 'void' },
    ]);

    expect(summary.total).toBe(750_000);
    expect(summary.count).toBe(3);
    expect(summary.voided).toBe(1);

    expect(summary.byCategory).toEqual([
      { category: 'Listrik', total: 600_000, count: 2 },
      { category: 'ATK', total: 150_000, count: 1 },
    ]);

    expect(summary.byDay.map((day) => [day.day, day.total, day.items.length])).toEqual([
      ['2026-11-12', 650_000, 2],
      ['2026-11-10', 100_000, 2],
    ]);
  });
});
