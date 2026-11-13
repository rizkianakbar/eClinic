import Link from 'next/link';
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

const STATE_LABEL = {
  open: 'Buka sekarang',
  before: 'Belum buka',
  after: 'Sudah tutup',
  closed: 'Tidak ada jadwal',
} as const;

/** Is the clinic open, until when, and who is practising today. */
export function HomeClinicToday(props: HomeClinicTodayProps) {
  const hours = clinicHours(props.sessions, props.now);
  const doctors = [...new Set(props.sessions.map((session) => session.doctorName))];
  const shown = doctors.slice(0, 4);
  const dot = (time: string) => time.replace(':', '.');

  return (
    <Frame href={props.href}>
      <div className="flex flex-col justify-center gap-0.5 px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className={cn(
              'size-2 rounded-full',
              hours.state === 'open' ? 'signal-pulse bg-primary text-primary' : 'bg-muted-foreground/40',
            )}
            aria-hidden
          />
          {STATE_LABEL[hours.state]}
        </span>
        <span className="tabular text-xs text-muted-foreground">
          {hours.from && hours.to ? `${dot(hours.from)}–${dot(hours.to)} WIB` : 'Atur jadwal dokter'}
        </span>
      </div>
      {doctors.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="flex -space-x-1.5">
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
          <span className="flex flex-col">
            <span className="text-sm font-medium">{doctors.length} dokter praktik</span>
            <span className="text-xs text-muted-foreground">
              {props.sessions.length} sesi · kuota {props.sessions.reduce((sum, session) => sum + session.quota, 0)}{' '}
              pasien
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
  const className = 'flex items-stretch divide-x rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]';

  return props.href ? (
    <Link href={props.href} title="Jadwal dokter" className={cn(className, 'transition-colors hover:border-input')}>
      {props.children}
    </Link>
  ) : (
    <div className={className}>{props.children}</div>
  );
}
