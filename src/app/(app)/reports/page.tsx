import type { Metadata } from 'next';
import { Suspense } from 'react';
import { type DateRange, parseRange, parseReportTab, type ReportTab, rangeDays } from '@/features/reports/reports.lib';
import {
  getDoctorFees,
  getProfitLoss,
  getRevenueReport,
  getTopDiseases,
  getVisitReport,
} from '@/features/reports/reports.service';
import { ReportsDoctorFees } from '@/features/reports/reports-doctor-fees';
import { ReportsExportLinks } from '@/features/reports/reports-export-links';
import { ReportsProfitLoss } from '@/features/reports/reports-profit-loss';
import { ReportsRangeFilter } from '@/features/reports/reports-range-filter';
import { ReportsRevenue } from '@/features/reports/reports-revenue';
import { ReportBodySkeleton } from '@/features/reports/reports-skeleton';
import { ReportsTabs } from '@/features/reports/reports-tabs';
import { ReportsTopDiseases } from '@/features/reports/reports-top-diseases';
import { ReportsVisits } from '@/features/reports/reports-visits';
import { requireRole } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Laporan' };

export default async function ReportsPage(props: PageProps<'/reports'>) {
  await requireRole('owner');

  const searchParams = await props.searchParams;
  const today = todayInJakarta();
  const range = parseRange(searchParams, today);
  const tab = parseReportTab(searchParams.tab);
  const days = rangeDays(range);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(range.from)} – {formatDate(range.to)} · {days.length} hari
          </p>
        </div>
        <ReportsExportLinks report={tab} range={range} />
      </header>
      <ReportsRangeFilter range={range} today={today} keep={{ tab }} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20">
          <ReportsTabs active={tab} range={range} />
        </div>
        <div className="min-w-0">
          {/* Keyed by report and period: switching either shows a placeholder here only; menu and filter stay. */}
          <Suspense key={`${tab}:${range.from}:${range.to}`} fallback={<ReportBodySkeleton />}>
            <ReportBody tab={tab} range={range} days={days} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function ReportBody(props: { tab: ReportTab; range: DateRange; days: string[] }) {
  const supabase = await createClient();
  const { range } = props;

  switch (props.tab) {
    case 'revenue':
      return <ReportsRevenue report={await getRevenueReport(supabase, range)} days={props.days} />;
    case 'doctor-fees':
      return <ReportsDoctorFees fees={await getDoctorFees(supabase, range)} />;
    case 'profit-loss':
      return <ReportsProfitLoss profitLoss={await getProfitLoss(supabase, range)} />;
    case 'visits':
      return <ReportsVisits rows={await getVisitReport(supabase, range)} days={props.days.length} />;
    case 'top-diseases':
      return <ReportsTopDiseases rows={await getTopDiseases(supabase, range)} />;
  }
}
