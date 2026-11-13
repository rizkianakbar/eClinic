import { DownloadIcon, PlusIcon, PrinterIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Skeleton, SkeletonAction, SkeletonLine, SkeletonPage } from '@/components/ui/skeleton';
import { ExpensesCategoriesSkeleton, ExpensesListSkeleton } from '@/features/expenses/expenses-skeleton';
import { ReportsKpisSkeleton, ReportsRangeFilterSkeleton } from '@/features/reports/reports-skeleton';

export default async function Loading() {
  const t = await getTranslations('expenses');

  return (
    <SkeletonPage route label={t('loading')}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{t('title')}</h1>
          <SkeletonLine className="w-80" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <SkeletonAction variant="outline" size="sm" icon={<DownloadIcon />}>
              Excel
            </SkeletonAction>
            <SkeletonAction variant="outline" size="sm" icon={<PrinterIcon />}>
              PDF
            </SkeletonAction>
          </div>
          <SkeletonAction icon={<PlusIcon />}>{t('form.record')}</SkeletonAction>
        </div>
      </header>
      <ReportsRangeFilterSkeleton />
      <ReportsKpisSkeleton labels={[t('kpi.total'), t('kpi.perDay'), t('kpi.biggest'), t('kpi.profit')]} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {t('list')}
            <Skeleton className="h-5 w-6 rounded-md" />
          </h2>
          <ExpensesListSkeleton />
        </section>
        <aside className="lg:sticky lg:top-20">
          <ExpensesCategoriesSkeleton />
        </aside>
      </div>
    </SkeletonPage>
  );
}
