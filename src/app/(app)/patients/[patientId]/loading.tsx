import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { PatientDetailSkeleton } from '@/features/patients/patients-skeleton';

export default async function Loading() {
  const t = await getTranslations('patients');

  return (
    <SkeletonPage route label={t('loading.detail')}>
      <PatientDetailSkeleton />
    </SkeletonPage>
  );
}
