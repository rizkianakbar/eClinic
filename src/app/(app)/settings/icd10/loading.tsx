import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsIcd10Skeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat kode ICD-10">
      <SettingsIcd10Skeleton />
    </SkeletonPage>
  );
}
