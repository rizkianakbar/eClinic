import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsSchedulesSkeleton } from '@/features/settings/settings-skeleton';
import { isoWeekday, todayInJakarta } from '@/lib/dates';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('settings.loading.schedules')}>
      <SettingsSchedulesSkeleton today={isoWeekday(todayInJakarta())} />
    </SkeletonPage>
  );
}
