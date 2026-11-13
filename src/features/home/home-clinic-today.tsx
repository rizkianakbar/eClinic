import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { initials } from '@/features/patients/patients.lib';
import type { PracticeSession } from '@/features/visits/visits.lib';
import { cn } from '@/lib/utils';
import { clinicHours } from './home.lib';

type HomeClinicTodayProps = {
  sessions: PracticeSession[];
  /** Jakarta time "HH:MM" at render. */
  now: string;
  /** Link to the schedules, for roles that may edit them. */
  href?: string;
};

/** Is the clinic open, until when, and who is practising today. */
export function HomeClinicToday(props: HomeClinicTodayProps) {
  const t = useTranslations('home.clinic');
  const hours = clinicHours(props.sessions, props.now);
  const doctors = [...new Set(props.sessions.map((session) => session.doctorName))];
  const shown = doctors.slice(0, 4);
  const hidden = doctors.slice(shown.length);
  const dot = (time: string) => time.slice(0, 5).replace(':', '.');
  const avatar =
    'flex size-8 items-center justify-center rounded-full text-[0.6875rem] font-semibold ring-2 ring-card outline-none focus-visible:ring-primary';

  // Who it is and where they practise today: one line per session, with how full it is.
  const doctorTip = (name: string) => (
    <span className="flex flex-col gap-1">
      <span className="font-semibold">{name}</span>
      {props.sessions
        .filter((session) => session.doctorName === name)
        .map((session) => (
          <span key={session.id} className="tabular flex justify-between gap-4 text-background/75">
            <span>
              {t('tipSession', { poli: session.poliName, from: dot(session.startTime), to: dot(session.endTime) })}
            </span>
            <span>{t('tipLoad', { taken: session.taken, quota: session.quota })}</span>
          </span>
        ))}
    </span>
  );

  return (
    <Frame href={props.href}>
      <div className="flex shrink-0 flex-col justify-center gap-0.5 px-4 py-2.5 whitespace-nowrap">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className={cn(
              'size-2 rounded-full',
              hours.state === 'open' ? 'signal-pulse bg-primary text-primary' : 'bg-muted-foreground/40',
            )}
            aria-hidden
          />
          {t(hours.state)}
        </span>
        <span className="tabular text-xs text-muted-foreground">
          {hours.from && hours.to ? t('hours', { from: dot(hours.from), to: dot(hours.to) }) : t('setUp')}
        </span>
      </div>
      {doctors.length > 0 && (
        <div className="flex min-w-0 items-center gap-3 px-4 py-2.5">
          {/* Phones keep the counts; the faces need the room. */}
          <TooltipProvider>
            <span className="hidden -space-x-1.5 sm:flex">
              {shown.map((name) => (
                <Tooltip
                  key={name}
                  trigger={
                    <span role="img" aria-label={name} className={cn(avatar, 'bg-secondary text-secondary-foreground')}>
                      {initials(name)}
                    </span>
                  }
                  content={doctorTip(name)}
                />
              ))}
              {hidden.length > 0 && (
                <Tooltip
                  trigger={<span className={cn(avatar, 'bg-muted')}>+{hidden.length}</span>}
                  content={
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">{t('tipMore')}</span>
                      {hidden.map((name) => (
                        <span key={name} className="text-background/75">
                          {name}
                        </span>
                      ))}
                    </span>
                  }
                />
              )}
            </span>
          </TooltipProvider>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{t('doctors', { count: doctors.length })}</span>
            <span className="truncate text-xs text-muted-foreground">
              {t('sessions', {
                sessions: props.sessions.length,
                quota: props.sessions.reduce((sum, session) => sum + session.quota, 0),
              })}
            </span>
          </span>
        </div>
      )}
    </Frame>
  );
}

type FrameProps = {
  href?: string;
  children: ReactNode;
};

function Frame(props: FrameProps) {
  const t = useTranslations('home.clinic');
  const className = 'flex items-stretch divide-x rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]';

  return props.href ? (
    <Link
      href={props.href}
      aria-label={t('schedules')}
      className={cn(className, 'transition-colors hover:border-input')}>
      {props.children}
    </Link>
  ) : (
    <div className={className}>{props.children}</div>
  );
}
