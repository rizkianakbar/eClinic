import { getLocale, getTranslations } from 'next-intl/server';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPage } from '@/components/ui/skeleton';
import { HomePharmacySkeleton } from '@/features/home/home-skeleton';
import { formatDate, todayInJakarta } from '@/lib/dates';

export default async function Loading() {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  return (
    <SkeletonPage route label={t('home.pharmacy.loading')}>
      <PageHeader
        title={t('nav.pharmacy')}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {formatDate(todayInJakarta(), locale)}
            <LiveIndicator />
          </span>
        }
      />
      <HomePharmacySkeleton />
    </SkeletonPage>
  );
}
