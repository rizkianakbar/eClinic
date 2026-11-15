import { describe, expect, it } from 'vitest';
import { companyTotals, stationCounts } from './company.lib';

const branch = (values: Partial<Parameters<typeof companyTotals>[0][number]>) => ({
  waiting: 0,
  in_exam: 0,
  to_pharmacy: 0,
  to_cashier: 0,
  done: 0,
  bpjs: 0,
  revenue: 0,
  paid_invoices: 0,
  series: [
    { day: '2026-11-14', revenue: 0, patients: 0 },
    { day: '2026-11-15', revenue: 0, patients: 0 },
  ],
  ...values,
});

describe('companyTotals', () => {
  it('adds every branch up, today and per day', () => {
    const totals = companyTotals([
      branch({
        waiting: 2,
        done: 5,
        bpjs: 1,
        revenue: 300_000,
        paid_invoices: 3,
        series: [
          { day: '2026-11-14', revenue: 100_000, patients: 4 },
          { day: '2026-11-15', revenue: 300_000, patients: 7 },
        ],
      }),
      branch({
        in_exam: 1,
        done: 2,
        revenue: 50_000,
        paid_invoices: 1,
        series: [
          { day: '2026-11-14', revenue: 20_000, patients: 1 },
          { day: '2026-11-15', revenue: 50_000, patients: 3 },
        ],
      }),
    ]);

    expect(totals.revenue).toBe(350_000);
    expect(totals.paidInvoices).toBe(4);
    expect(totals.bpjs).toBe(1);
    expect(totals.patients).toBe(10);
    expect(totals.counts).toEqual({ waiting: 2, in_exam: 1, to_pharmacy: 0, to_cashier: 0, done: 7 });
    expect(totals.series).toEqual([
      { day: '2026-11-14', revenue: 120_000, patients: 5 },
      { day: '2026-11-15', revenue: 350_000, patients: 10 },
    ]);
  });

  it('is all zeros without branches', () => {
    expect(companyTotals([])).toMatchObject({ revenue: 0, patients: 0, series: [] });
  });
});

describe('stationCounts', () => {
  it('reads the five stations', () => {
    expect(stationCounts(branch({ waiting: 1, to_cashier: 2 }))).toEqual({
      waiting: 1,
      in_exam: 0,
      to_pharmacy: 0,
      to_cashier: 2,
      done: 0,
    });
  });
});
