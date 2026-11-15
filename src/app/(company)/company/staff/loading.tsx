import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPage } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('company.staff.loading')}>
      <PageHeader title={t('company.staff.title')} description={t('company.staff.description')} />
      <TableSkeleton
        rows={6}
        lines={2}
        columns={[
          { label: t('branches.staff.colName'), bar: 'w-40' },
          { label: '', className: 'text-center', bar: 'w-4' },
          { label: '', className: 'text-center', bar: 'w-4' },
        ]}
      />
    </SkeletonPage>
  );
}
