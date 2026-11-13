import { getLocale, getTranslations } from 'next-intl/server';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { SkeletonPage } from '@/components/ui/skeleton';
import { HomeClinicTodaySkeleton } from '@/features/home/home-skeleton';
import { VisitsRegistrationSkeleton } from '@/features/visits/visits-skeleton';
import { formatDate, todayInJakarta } from '@/lib/dates';

export default async function Loading() {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  return (
    <SkeletonPage route label={t('registration.loading')}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{t('nav.registration')}</h1>
          <p className="inline-flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {formatDate(todayInJakarta(), locale)}
            <LiveIndicator />
          </p>
        </div>
        <HomeClinicTodaySkeleton />
      </header>
      <VisitsRegistrationSkeleton />
    </SkeletonPage>
  );
}
