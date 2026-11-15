import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';
import { CompanyOverviewSkeleton } from '@/features/company/company-skeleton';

export default async function Loading() {
  const t = await getTranslations('company');

  return (
    <SkeletonPage route label={t('overview.loading')}>
      <PageHeader title={<Skeleton className="h-8 w-56" />} description={<Skeleton className="h-4 w-72" />} />
      <CompanyOverviewSkeleton />
    </SkeletonPage>
  );
}
