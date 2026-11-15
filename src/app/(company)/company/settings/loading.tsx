import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';

export default async function Loading() {
  const t = await getTranslations('company.settings');

  return (
    <SkeletonPage route label={t('loading')}>
      <PageHeader title={t('title')} description={t('description')} />
      <Skeleton className="h-64 max-w-2xl rounded-xl" />
    </SkeletonPage>
  );
}
