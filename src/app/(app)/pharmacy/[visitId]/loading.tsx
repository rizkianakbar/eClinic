import { SkeletonPage } from '@/components/ui/skeleton';
import { PharmacyDispenseSkeleton } from '@/features/pharmacy/pharmacy-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat resep">
      <PharmacyDispenseSkeleton />
    </SkeletonPage>
  );
}
