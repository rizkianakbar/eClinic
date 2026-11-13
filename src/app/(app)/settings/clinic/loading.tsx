import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsClinicSkeleton } from '@/features/settings/settings-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('settings.loading.clinic')}>
      <SettingsClinicSkeleton />
    </SkeletonPage>
  );
}
