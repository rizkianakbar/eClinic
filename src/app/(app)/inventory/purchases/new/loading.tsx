import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryPurchaseFormSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat formulir pembelian">
      <InventoryPurchaseFormSkeleton />
    </SkeletonPage>
  );
}
