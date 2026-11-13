import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryStockSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat stok">
      <InventoryStockSkeleton />
    </SkeletonPage>
  );
}
