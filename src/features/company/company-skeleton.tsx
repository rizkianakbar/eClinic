import { useTranslations } from 'next-intl';
import { placeholders, Skeleton } from '@/components/ui/skeleton';

/** The company overview while it loads: the trend and "now" panels, then three branch cards. */
export function CompanyOverviewSkeleton() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-2.5 lg:col-span-2">
          <p className="flex min-h-7 items-center text-sm font-semibold">{t('company.overview.trend')}</p>
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="flex min-h-7 items-center text-sm font-semibold">{t('home.owner.now')}</p>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="flex min-h-7 items-center text-sm font-semibold">{t('company.overview.branches')}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {placeholders(3).map((key) => (
            <Skeleton key={key} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
