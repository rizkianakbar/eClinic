import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { InventorySearchSkeleton } from '@/features/inventory/inventory-search';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('settings.loading.medicines')}>
      <SettingsMasterListSkeleton
        intro={<InventorySearchSkeleton placeholder={t('inventory.searchMedicine')} />}
        importable
        create={t('inventory.medicineForm.add')}
        rows={10}
        columns={[
          { label: t('inventory.medicines.colName'), bar: 'w-40' },
          { label: t('inventory.medicines.colUnit'), className: 'hidden md:table-cell', bar: 'w-12' },
          { label: t('inventory.medicines.colPrice'), className: 'hidden text-right md:table-cell', bar: 'w-16' },
          { label: t('inventory.medicines.colMin'), className: 'hidden text-right md:table-cell', bar: 'w-8' },
          { label: t('inventory.medicines.colKfa'), className: 'hidden md:table-cell', bar: 'w-16' },
          { label: t('inventory.medicines.colStatus'), className: 'hidden md:table-cell', bar: 'w-14' },
          { label: t('inventory.medicines.colActions'), className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
