import type { JourneyStatus } from '@/features/visits/visits.constants';

type BranchToday = {
  waiting: number;
  in_exam: number;
  to_pharmacy: number;
  to_cashier: number;
  done: number;
  bpjs: number;
  revenue: number;
  paid_invoices: number;
  series: { day: string; revenue: number; patients: number }[];
};

/** Where a branch's patients are now, as journey-station counts. */
export function stationCounts(branch: Pick<BranchToday, JourneyStatus>): Record<JourneyStatus, number> {
  return {
    waiting: branch.waiting,
    in_exam: branch.in_exam,
    to_pharmacy: branch.to_pharmacy,
    to_cashier: branch.to_cashier,
    done: branch.done,
  };
}

/** The whole company: every branch added up, today and per day (series align: same days, same order). */
export function companyTotals(branches: readonly BranchToday[]) {
  const days = branches[0]?.series.map((entry) => entry.day) ?? [];

  const series = days.map((day, index) => ({
    day,
    revenue: branches.reduce((sum, branch) => sum + (branch.series[index]?.revenue ?? 0), 0),
    patients: branches.reduce((sum, branch) => sum + (branch.series[index]?.patients ?? 0), 0),
  }));

  const counts = branches.reduce<Record<JourneyStatus, number>>(
    (sum, branch) => {
      const own = stationCounts(branch);

      return {
        waiting: sum.waiting + own.waiting,
        in_exam: sum.in_exam + own.in_exam,
        to_pharmacy: sum.to_pharmacy + own.to_pharmacy,
        to_cashier: sum.to_cashier + own.to_cashier,
        done: sum.done + own.done,
      };
    },
    { waiting: 0, in_exam: 0, to_pharmacy: 0, to_cashier: 0, done: 0 },
  );

  return {
    series,
    counts,
    revenue: branches.reduce((sum, branch) => sum + branch.revenue, 0),
    paidInvoices: branches.reduce((sum, branch) => sum + branch.paid_invoices, 0),
    bpjs: branches.reduce((sum, branch) => sum + branch.bpjs, 0),
    patients: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}
