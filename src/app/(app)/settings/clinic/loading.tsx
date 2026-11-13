import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsClinicSkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat profil klinik">
      <SettingsClinicSkeleton />
    </SkeletonPage>
  );
}
