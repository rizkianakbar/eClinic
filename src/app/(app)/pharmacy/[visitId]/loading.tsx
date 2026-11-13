import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { PharmacyDispenseSkeleton } from '@/features/pharmacy/pharmacy-skeleton';

export default async function Loading() {
  const t = await getTranslations('pharmacy');

  return (
    <SkeletonPage route label={t('loading')}>
      <PharmacyDispenseSkeleton />
    </SkeletonPage>
  );
}
