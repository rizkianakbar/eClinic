import { addDays, addMonths } from '@/lib/dates';

export type DateRange = { from: string; to: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

/** Report range from ?from=&to= (Jakarta dates); defaults to this month so far. Invalid input falls back. */
export function parseRange(params: { from?: string | string[]; to?: string | string[] }, today: string): DateRange {
  const from = first(params.from);
  const to = first(params.to);

  if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to) && from <= to && daysBetween(from, to) <= MAX_DAYS) {
    return { from, to };
  }

  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** Quick ranges for the filter. */
export function rangePresets(today: string) {
  const thisMonth = `${today.slice(0, 7)}-01`;
  const lastMonthStart = addMonths(thisMonth, -1);
  const lastMonthEnd = new Date(Date.parse(`${thisMonth}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

  return [
    { label: 'Hari ini', from: today, to: today },
    { label: '7 hari', from: addDays(today, -6), to: today },
    { label: 'Bulan ini', from: thisMonth, to: today },
    { label: 'Bulan lalu', from: lastMonthStart, to: lastMonthEnd },
  ];
}

export const REPORT_TABS = ['revenue', 'doctor-fees', 'profit-loss', 'visits', 'top-diseases'] as const;

export type ReportTab = (typeof REPORT_TABS)[number];

export function parseReportTab(value: string | string[] | undefined): ReportTab {
  const tab = first(value);

  return REPORT_TABS.includes(tab as ReportTab) ? (tab as ReportTab) : 'revenue';
}

/** Every exportable report (Excel and print/PDF), with its Indonesian title. */
export const EXPORT_REPORTS = {
  revenue: 'Laporan Pendapatan',
  'doctor-fees': 'Laporan Jasa Medis',
  'profit-loss': 'Laporan Laba Rugi',
  visits: 'Laporan Kunjungan',
  'top-diseases': '10 Besar Penyakit',
  expenses: 'Laporan Pengeluaran',
} as const;

export type ExportReport = keyof typeof EXPORT_REPORTS;

export function isExportReport(value: string): value is ExportReport {
  return Object.hasOwn(EXPORT_REPORTS, value);
}

/** e.g. "laporan-pendapatan_2026-11-01_2026-11-12.xlsx" */
export function exportFileName(report: ExportReport, range: DateRange) {
  return `${EXPORT_REPORTS[report].toLowerCase().replace(/\s+/g, '-')}_${range.from}_${range.to}.xlsx`;
}

/** Every date in the range, oldest first (for charts that must show empty days too). */
export function rangeDays(range: DateRange) {
  const days: string[] = [];

  for (let day = range.from; day <= range.to; day = addDays(day, 1)) days.push(day);

  return days;
}

/**
 * The income statement as lines: revenue, cost of medicines, gross profit,
 * operating expenses, net profit, with margins against revenue (null when
 * there is no revenue to compare with).
 */
export function profitLossStatement(input: {
  revenue: number;
  medicine_cost: number;
  expenses: number;
  profit: number;
}) {
  const gross = input.revenue - input.medicine_cost;
  const margin = (value: number) => (input.revenue > 0 ? Math.round((value / input.revenue) * 100) : null);

  return {
    revenue: input.revenue,
    medicineCost: input.medicine_cost,
    gross,
    grossMargin: margin(gross),
    expenses: input.expenses,
    net: input.profit,
    netMargin: margin(input.profit),
  };
}
