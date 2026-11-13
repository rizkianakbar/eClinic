import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { VisitStatus } from './visits.constants';

/** Patient-journey colours: the same status looks the same everywhere. */
const STATUS_STYLES: Record<VisitStatus, string> = {
  registered: 'bg-status-waiting-soft text-status-waiting',
  waiting: 'bg-status-waiting-soft text-status-waiting',
  in_exam: 'bg-status-exam-soft text-status-exam',
  to_pharmacy: 'bg-status-pharmacy-soft text-status-pharmacy',
  to_cashier: 'bg-status-cashier-soft text-status-cashier',
  done: 'bg-status-done-soft text-status-done',
  cancelled: 'bg-status-cancelled-soft text-status-cancelled',
};

type VisitsStatusBadgeProps = {
  status: VisitStatus;
  className?: string;
};

export function VisitsStatusBadge(props: VisitsStatusBadgeProps) {
  const t = useTranslations('visitStatus');

  return (
    <span
      className={cn(
        'inline-flex h-7 w-fit shrink-0 items-center gap-2 rounded-full px-3 text-[0.88rem] font-semibold whitespace-nowrap',
        STATUS_STYLES[props.status],
        props.className,
      )}>
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {t(props.status)}
    </span>
  );
}
