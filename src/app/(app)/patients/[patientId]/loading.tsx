import { SkeletonPage } from '@/components/ui/skeleton';
import { PatientDetailSkeleton } from '@/features/patients/patients-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat data pasien">
      <PatientDetailSkeleton />
    </SkeletonPage>
  );
}
