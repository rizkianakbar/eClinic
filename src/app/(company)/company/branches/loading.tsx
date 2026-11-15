import { PlusIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonAction, SkeletonPage } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('company.branches.loading')}>
      <PageHeader
        title={t('company.branches.title')}
        description={t('company.branches.description')}
        actions={<SkeletonAction icon={<PlusIcon />}>{t('branches.create.open')}</SkeletonAction>}
      />
      <TableSkeleton
        rows={3}
        lines={2}
        columns={[
          { label: t('company.branches.colBranch'), bar: 'w-48' },
          { label: t('company.branches.colStaff'), className: 'text-right', bar: 'w-8' },
          { label: t('company.branches.colOpened'), bar: 'w-24' },
          { label: '', className: 'text-right', bar: 'w-8' },
        ]}
      />
    </SkeletonPage>
  );
}
