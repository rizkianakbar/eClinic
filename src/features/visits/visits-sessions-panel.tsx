import { CalendarXIcon, UserRoundSearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { initials } from '@/features/patients/patients.lib';
import { toHourMinute } from '@/features/schedules/schedules.lib';
import { cn } from '@/lib/utils';
import { type PracticeSession, sessionEnded } from './visits.lib';

type VisitsSessionsPanelProps = {
  sessions: PracticeSession[];
  now: string;
};

/** Before a patient is chosen: which doctors are practising today and how many places are left. */
export function VisitsSessionsPanel(props: VisitsSessionsPanelProps) {
  const t = useTranslations('visits.sessions');
  const left = props.sessions.reduce((sum, session) => sum + Math.max(0, session.quota - session.taken), 0);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <UserRoundSearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-[0.8125rem] text-muted-foreground">{t('intro')}</p>
      </div>
      {props.sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
          <CalendarXIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t('none')}</p>
        </div>
      ) : (
        <ul>
          {[...props.sessions]
            .sort((a, b) => Number(sessionEnded(a, props.now)) - Number(sessionEnded(b, props.now)))
            .map((session) => {
              const full = session.taken >= session.quota;
              const ended = sessionEnded(session, props.now);

              const fill = Math.min(100, (session.taken / Math.max(1, session.quota)) * 100);

              return (
                <li
                  key={session.id}
                  className={cn('flex items-center gap-3 border-b px-4 py-3 last:border-0', ended && 'opacity-60')}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground">
                    {initials(session.doctorName)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{session.doctorName}</span>
                      <span
                        className={cn(
                          'tabular shrink-0 text-xs',
                          full ? 'font-semibold text-destructive' : 'text-muted-foreground',
                        )}>
                        {full ? t('full') : t('left', { count: session.quota - session.taken })}
                      </span>
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn('block h-full rounded-full', full ? 'bg-destructive' : 'bg-primary')}
                        style={{ width: `${fill}%` }}
                      />
                    </span>
                    <span className="tabular text-xs text-muted-foreground">
                      {session.poliName} · {toHourMinute(session.startTime)}–{toHourMinute(session.endTime)}
                      {ended && t('ended')}
                    </span>
                  </span>
                </li>
              );
            })}
        </ul>
      )}
      {props.sessions.length > 0 && (
        <p className="border-t bg-muted/30 px-4 py-2.5 text-[0.8125rem] text-muted-foreground">
          {t.rich('quotaLeft', {
            count: left,
            b: (chunks) => <span className="tabular font-semibold text-foreground">{chunks}</span>,
          })}
        </p>
      )}
    </div>
  );
}
