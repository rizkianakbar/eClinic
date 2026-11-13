import { SkeletonPage } from '@/components/ui/skeleton';
import { InventoryOpnameFormSkeleton } from '@/features/inventory/inventory-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat batch">
      <InventoryOpnameFormSkeleton />
    </SkeletonPage>
  );
}
