import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryStockSkeleton } from '@/features/inventory/inventory-skeleton';

export default async function Loading() {
  const t = await getTranslations('inventory.loading');

  return (
    <SkeletonPage route label={t('stock')}>
      <InventoryStockSkeleton />
    </SkeletonPage>
  );
}
