import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsSchedulesSkeleton } from '@/features/settings/settings-skeleton';
import { isoWeekday, todayInJakarta } from '@/lib/dates';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat jadwal dokter">
      <SettingsSchedulesSkeleton today={isoWeekday(todayInJakarta())} />
    </SkeletonPage>
  );
}
