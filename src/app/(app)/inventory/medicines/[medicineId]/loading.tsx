import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryStockCardSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat kartu stok">
      <InventoryStockCardSkeleton />
    </SkeletonPage>
  );
}
