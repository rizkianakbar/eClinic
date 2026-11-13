import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsActivitySkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat log aktivitas">
      <SettingsActivitySkeleton />
    </SkeletonPage>
  );
}
