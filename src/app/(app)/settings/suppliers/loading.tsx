import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('settings.loading.suppliers')}>
      <SettingsMasterListSkeleton
        intro={<p className="text-sm text-muted-foreground">{t('inventory.suppliers.intro')}</p>}
        importable
        create={t('inventory.supplierForm.add')}
        rows={4}
        columns={[
          { label: t('inventory.suppliers.colName'), bar: 'w-40' },
          { label: t('inventory.suppliers.colPhone'), className: 'hidden md:table-cell', bar: 'w-28' },
          { label: t('inventory.suppliers.colAddress'), className: 'hidden md:table-cell', bar: 'w-48' },
          { label: t('inventory.suppliers.colStatus'), className: 'hidden md:table-cell', bar: 'w-14' },
          { label: t('inventory.suppliers.colActions'), className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
