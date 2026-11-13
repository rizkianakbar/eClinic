import { CalendarRangeIcon } from 'lucide-react';
import { NavTabs } from '@/components/ui/nav-tabs';
import { SegmentedSkeleton } from '@/components/ui/segmented-skeleton';
import { Skeleton, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { ReportsSection } from './reports-section';
import { REPORTS } from './reports-tabs';

/** The period filter (ReportsRangeFilter): presets and dates drawn as they will be, the current period unknown. */
export function ReportsRangeFilterSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRangeIcon className="ml-1.5 size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Periode</span>
        <SegmentedSkeleton options={['Hari ini', '7 hari', 'Bulan ini', 'Bulan lalu']} selected={null} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-38 rounded-lg" />
        <span className="text-sm text-muted-foreground">s/d</span>
        <Skeleton className="h-8 w-38 rounded-lg" />
        <SkeletonButton size="sm" className="w-24" />
      </div>
    </div>
  );
}

/** The report menu: every report with its real label and question; which one is open comes with the page. */
export function ReportsTabsSkeleton() {
  return (
    <>
      <NavTabs
        label="Jenis laporan"
        className="lg:hidden"
        tabs={REPORTS.map((report) => ({ href: `?tab=${report.tab}`, label: report.label, active: false }))}
      />
      <nav aria-hidden className="hidden flex-col gap-1 lg:flex">
        {REPORTS.map((report) => (
          <span key={report.tab} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <report.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{report.label}</span>
              <span className="block text-xs text-muted-foreground">{report.question}</span>
            </span>
          </span>
        ))}
      </nav>
    </>
  );
}

type ReportsKpisSkeletonProps = {
  /** The real labels of the headline numbers. */
  labels: string[];
};

/** ReportsKpis' strip: real labels, numbers loading. */
export function ReportsKpisSkeleton(props: ReportsKpisSkeletonProps) {
  return (
    <div className="grid grid-cols-1 divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:divide-x sm:divide-y-0">
      {props.labels.map((label) => (
        <div
          key={label}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 px-4 py-3 sm:flex sm:flex-col sm:gap-1 sm:px-5 sm:py-4">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="sm:hidden">
            <SkeletonLine size="numeral-xl" className="w-24" />
          </span>
          <span className="hidden sm:block">
            <SkeletonLine size="numeral-2xl" className="w-32" />
          </span>
          <span className="col-span-2">
            <SkeletonLine size="xs" className="w-36" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** A daily bar chart section (ReportsBarChart) while it loads: the frame and the axis, bars in grey. */
export function ReportsChartSkeleton(props: { title: string }) {
  return (
    <ReportsSection title={props.title}>
      <div className="p-4">
        <div className="flex h-48 items-end gap-1 pl-16">
          {[40, 55, 30, 70, 45, 62, 50, 35, 58, 66, 42, 75, 52, 60].map((height, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder bars.
              key={index}
              aria-hidden
              className="flex-1 animate-pulse rounded-t-[3px] bg-foreground/7"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-2 h-4" />
      </div>
    </ReportsSection>
  );
}

/** A report's body while it loads (the revenue report's shape: numbers, chart, two breakdowns). */
export function ReportBodySkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy aria-label="Memuat laporan">
      <ReportsKpisSkeleton labels={['Pendapatan (umum)', 'Tagihan lunas', 'Diskon', 'Kunjungan BPJS']} />
      <ReportsChartSkeleton title="Pendapatan per hari" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {['Per poli', 'Per metode pembayaran'].map((title) => (
          <ReportsSection key={title} title={title}>
            <ul className="flex flex-col gap-4 p-4">
              {['a', 'b'].map((key) => (
                <li key={key} className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between gap-3">
                    <SkeletonLine className="w-28" />
                    <SkeletonLine className="w-20" />
                  </span>
                  <span className="h-2 rounded-full bg-muted" />
                  <SkeletonLine size="xs" className="w-40" />
                </li>
              ))}
            </ul>
          </ReportsSection>
        ))}
      </div>
    </div>
  );
}
