import { SearchIcon, UserRoundSearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SegmentedSkeleton } from '@/components/ui/segmented-skeleton';
import { placeholders, Skeleton, SkeletonLine } from '@/components/ui/skeleton';

/** Pendaftaran while it loads: the search box, today's list, and the doctors' quota panel, in their real frames. */
export function VisitsRegistrationSkeleton() {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold">{t('visits.desk.step1')}</h2>
          <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-col gap-3">
              <div className="relative flex h-12 items-center rounded-xl border border-input bg-card pl-11 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
                <SearchIcon
                  className="absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-base text-muted-foreground/70">{t('patients.search.placeholder')}</span>
              </div>
              <SkeletonLine className="w-80" />
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {t('visits.today.title')}
              <Skeleton className="h-5 w-6 rounded-md" />
            </h2>
            <SegmentedSkeleton
              options={['all', 'waiting', 'served', 'done', 'cancelled'].map((key) =>
                t(`visits.today.${key as 'all'}`),
              )}
            />
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <ul>
              {placeholders(5).map((key) => (
                <li
                  key={key}
                  className="grid grid-cols-[2.75rem_2.25rem_minmax(0,1fr)_6.5rem] items-center gap-3 border-b px-4 py-2.5 last:border-0 md:grid-cols-[2.75rem_2.25rem_minmax(0,1.3fr)_minmax(0,1fr)_3.5rem_6.5rem]">
                  <SkeletonLine className="w-10" />
                  <Skeleton className="size-9 rounded-lg" />
                  <span className="min-w-0">
                    <SkeletonLine className="w-36" />
                    <SkeletonLine size="xs" className="w-20" />
                  </span>
                  <span className="hidden min-w-0 md:block">
                    <SkeletonLine className="w-24" />
                    <SkeletonLine size="xs" className="w-32" />
                  </span>
                  <span className="hidden md:block">
                    <Skeleton className="h-5 w-10 rounded" />
                  </span>
                  <SkeletonLine className="w-20" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">{t('visits.desk.step2')}</h2>
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
            <UserRoundSearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-[0.8125rem] text-muted-foreground">{t('visits.sessions.intro')}</p>
          </div>
          <ul>
            {placeholders(2).map((key) => (
              <li key={key} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-center justify-between gap-2">
                    <SkeletonLine className="w-36" />
                    <SkeletonLine size="xs" className="w-12" />
                  </span>
                  <span className="h-1 rounded-full bg-muted" />
                  <SkeletonLine size="xs" className="w-40" />
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t bg-muted/30 px-4 py-2.5">
            <SkeletonLine className="w-44" />
          </p>
        </div>
      </aside>
    </div>
  );
}
