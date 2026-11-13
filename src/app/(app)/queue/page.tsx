import { getLocale, getTranslations } from 'next-intl/server';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { PageHeader } from '@/components/ui/page-header';
import { QUEUE_VIEWER_ROLES } from '@/features/queue/queue.lib';
import { QueueBoard } from '@/features/queue/queue-board';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';

export const generateMetadata = pageTitle('nav.queue');

export default async function QueuePage() {
  const session = await requireRole(...QUEUE_VIEWER_ROLES);
  const today = todayInJakarta();
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  return (
    <>
      <PageHeader
        title={t('nav.queue')}
        description={
          <span className="inline-flex items-center gap-2">
            {formatDate(today, locale)}
            <LiveIndicator />
          </span>
        }
      />
      <QueueBoard actor={{ role: session.role, userId: session.userId }} visitDate={today} />
    </>
  );
}
