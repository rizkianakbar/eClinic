import { SkeletonPage } from '@/components/ui/skeleton';
import { ExamSkeleton } from '@/features/exam/exam-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat pemeriksaan">
      <ExamSkeleton />
    </SkeletonPage>
  );
}
