import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryOpnamesSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat stok opname">
      <InventoryOpnamesSkeleton />
    </SkeletonPage>
  );
}
