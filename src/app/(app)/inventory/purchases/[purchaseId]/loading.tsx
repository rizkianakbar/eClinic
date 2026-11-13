import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryPurchaseSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat faktur">
      <InventoryPurchaseSkeleton />
    </SkeletonPage>
  );
}
