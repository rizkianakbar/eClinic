import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryStockCardSkeleton } from '@/features/inventory/inventory-skeleton';

export default async function Loading() {
  const t = await getTranslations('inventory.loading');

  return (
    <SkeletonPage route label={t('card')}>
      <InventoryStockCardSkeleton />
    </SkeletonPage>
  );
}
