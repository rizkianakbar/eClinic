import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryPurchasesSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat pembelian">
      <InventoryPurchasesSkeleton />
    </SkeletonPage>
  );
}
