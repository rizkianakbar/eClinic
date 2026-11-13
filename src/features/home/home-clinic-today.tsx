import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
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
  const dot = (time: string) => time.replace(':', '.');

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
          <span className="hidden -space-x-1.5 sm:flex">
            {shown.map((name) => (
              <span
                key={name}
                title={name}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground ring-2 ring-card">
                {initials(name)}
              </span>
            ))}
            {doctors.length > shown.length && (
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-semibold ring-2 ring-card">
                +{doctors.length - shown.length}
              </span>
            )}
          </span>
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
    <Link href={props.href} title={t('schedules')} className={cn(className, 'transition-colors hover:border-input')}>
      {props.children}
    </Link>
  ) : (
    <div className={className}>{props.children}</div>
  );
}
