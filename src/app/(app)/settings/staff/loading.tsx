import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsStaffSkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat staf" className="gap-4">
      <SettingsStaffSkeleton />
    </SkeletonPage>
  );
}
