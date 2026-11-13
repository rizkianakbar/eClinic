import { getLocale, getTranslations } from 'next-intl/server';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPage } from '@/components/ui/skeleton';
import { QueueBoardSkeleton } from '@/features/queue/queue-skeleton';
import { getSession } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';

export default async function Loading() {
  const [session, t, locale] = await Promise.all([getSession(), getTranslations(), getLocale()]);

  return (
    <SkeletonPage route label={t('queue.loading')}>
      <PageHeader
        title={t('nav.queue')}
        description={
          <span className="inline-flex items-center gap-2">
            {formatDate(todayInJakarta(), locale)}
            <LiveIndicator />
          </span>
        }
      />
      <QueueBoardSkeleton doctor={session?.role === 'doctor'} />
    </SkeletonPage>
  );
}
