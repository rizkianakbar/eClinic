import { DownloadIcon, PrinterIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SkeletonAction, SkeletonLine, SkeletonPage } from '@/components/ui/skeleton';
import {
  ReportBodySkeleton,
  ReportsRangeFilterSkeleton,
  ReportsTabsSkeleton,
} from '@/features/reports/reports-skeleton';

export default async function Loading() {
  const t = await getTranslations('reports');

  return (
    <SkeletonPage route label={t('loading')}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{t('title')}</h1>
          <SkeletonLine className="w-64" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonAction variant="outline" size="sm" icon={<DownloadIcon />}>
            Excel
          </SkeletonAction>
          <SkeletonAction variant="outline" size="sm" icon={<PrinterIcon />}>
            PDF
          </SkeletonAction>
        </div>
      </header>
      <ReportsRangeFilterSkeleton />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20">
          <ReportsTabsSkeleton />
        </div>
        <div className="min-w-0">
          <ReportBodySkeleton />
        </div>
      </div>
    </SkeletonPage>
  );
}
