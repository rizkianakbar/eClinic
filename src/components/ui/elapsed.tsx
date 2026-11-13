'use client';

import { ClockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

type ElapsedProps = {
  /** When the wait started (ISO). */
  since: string;
  /** Server render time, so the first paint matches. */
  now: number;
  className?: string;
};

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);

  return () => window.clearInterval(timer);
}

const minutesBetween = (from: string, to: number) => Math.max(0, Math.floor((to - new Date(from).getTime()) / 60_000));

/** "12 mnt" (en: "12 min"), ticking; amber from 10 minutes, red from 20. */
export function Elapsed(props: ElapsedProps) {
  const now = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => props.now,
  );

  const t = useTranslations('common.elapsed');
  const minutes = minutesBetween(props.since, now);

  const label =
    minutes < 1
      ? t('new')
      : minutes < 60
        ? t('minutes', { minutes })
        : t('hours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });

  return (
    <span
      title={t('title')}
      className={cn(
        'tabular inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-medium',
        minutes >= 20
          ? 'bg-status-cancelled-soft text-status-cancelled'
          : minutes >= 10
            ? 'bg-status-waiting-soft text-status-waiting'
            : 'bg-muted text-muted-foreground',
        props.className,
      )}>
      <ClockIcon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
