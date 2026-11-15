import { ActivityIcon, MegaphoneIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ageInYears } from '@/features/patients/patients.lib';
import type { JourneyStatus } from '@/features/visits/visits.constants';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { formatTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { QueueVisit } from './queue.lib';

type QueueTicketProps = {
  visit: QueueVisit;
  station: JourneyStatus;
  /** Compact tickets sit in the narrow lanes (exam, pharmacy, cashier). */
  size?: 'full' | 'compact';
  /** Opens the visit when the whole ticket is a link. */
  href?: string;
  /** Show which poli the number belongs to (numbers restart per poli). */
  showPoli?: boolean;
  actions?: ReactNode;
};

/** One patient in the queue: the number in the station's colour, then who they are. */
export function QueueTicket(props: QueueTicketProps) {
  const { visit } = props;
  const t = useTranslations();
  const locale = useLocale();
  const color = STATION_COLORS[props.station];
  const compact = props.size === 'compact';
  const called = Boolean(visit.called_at) && !visit.skipped_at && props.station === 'waiting';
  const patient = visit.patient;

  const meta = [
    !compact &&
      patient &&
      `${t(`sex.${patient.sex as 'male' | 'female'}`)}, ${t('patients.ageShort', { age: ageInYears(patient.birth_date) })}`,
    props.showPoli && visit.poli?.name,
    !compact && visit.doctor?.full_name,
  ].filter(Boolean);

  const body = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]',
        compact ? 'p-2.5' : 'p-3',
        called && 'border-line-waiting/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--line-waiting)_14%,transparent)]',
      )}>
      <span
        className={cn(
          'numeral flex shrink-0 items-center justify-center rounded-lg',
          compact ? 'size-9 text-base' : 'size-12 text-[1.375rem]',
          called ? cn(color.line, 'text-white') : cn(color.soft, color.text),
        )}>
        {visit.queue_no}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">{patient?.full_name ?? '-'}</p>
          {visit.payer_type === 'bpjs' && (
            <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
              BPJS
            </span>
          )}
        </div>
        {meta.length > 0 && <p className="truncate text-[0.8125rem] text-muted-foreground">{meta.join(' · ')}</p>}
        {called && (
          <p className={cn('flex items-center gap-1.5 text-[0.8125rem] font-medium', color.text)}>
            <MegaphoneIcon className="size-3.5" aria-hidden />
            {t('queue.ticket.called', { time: formatTime(visit.called_at!, locale) })}
          </p>
        )}
        {props.station === 'waiting' && visit.vitals_recorded_at === null && (
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-status-waiting">
            <ActivityIcon className="size-3.5" aria-hidden />
            {t('queue.ticket.needsVitals')}
          </p>
        )}
        {visit.skipped_at && (
          <p className="text-[0.8125rem] font-medium text-status-cancelled">
            {t('queue.ticket.skipped', { time: formatTime(visit.skipped_at, locale) })}
          </p>
        )}
        {props.actions && <div className="mt-2 flex flex-wrap gap-1.5">{props.actions}</div>}
      </div>
    </div>
  );

  if (!props.href) return body;

  return (
    <Link
      href={props.href}
      className="block rounded-xl transition-transform duration-150 ease-out active:scale-[0.98] hover:[&>div]:border-input">
      {body}
    </Link>
  );
}
