import { LiveIndicator } from '@/components/ui/live-indicator';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPage } from '@/components/ui/skeleton';
import { HomePharmacySkeleton } from '@/features/home/home-skeleton';
import { formatDate, todayInJakarta } from '@/lib/dates';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat resep masuk">
      <PageHeader
        title="Resep masuk"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {formatDate(todayInJakarta())}
            <LiveIndicator />
          </span>
        }
      />
      <HomePharmacySkeleton />
    </SkeletonPage>
  );
}
