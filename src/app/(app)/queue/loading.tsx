import { LiveIndicator } from '@/components/ui/live-indicator';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPage } from '@/components/ui/skeleton';
import { QueueBoardSkeleton } from '@/features/queue/queue-skeleton';
import { getSession } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';

export default async function Loading() {
  const session = await getSession();

  return (
    <SkeletonPage route label="Memuat antrean">
      <PageHeader
        title="Antrean"
        description={
          <span className="inline-flex items-center gap-2">
            {formatDate(todayInJakarta())}
            <LiveIndicator />
          </span>
        }
      />
      <QueueBoardSkeleton doctor={session?.role === 'doctor'} />
    </SkeletonPage>
  );
}
