'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { JOURNEY } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { cn } from '@/lib/utils';
import { BOARD_DONE, BOARD_START, BOARD_TICK_MS, nextBoard } from './site.lib';

/**
 * The hero's living example of the product's signature: a queue board where patients move through the five
 * stations, in the journey colours. Decorative (aria-hidden list, one label for screen readers); still under
 * prefers-reduced-motion.
 */
export function SiteJourneyBoard() {
  const t = useTranslations();
  const [state, setState] = useState({ patients: BOARD_START, served: 21, tick: 0 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;

      setState((current) => {
        const next = nextBoard(current.patients, current.tick);

        return { patients: next.patients, served: current.served + next.served, tick: current.tick + 1 };
      });
    }, BOARD_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <figure
      aria-label={t('site.board.label')}
      className="relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04),0_24px_48px_-24px_rgb(15_47_40/0.25)]">
      <figcaption className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {t('site.board.title')}
          <span className="rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
            {t('site.board.poli')}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <span className="signal-pulse size-1.5 rounded-full bg-current" aria-hidden />
          {t('common.live')}
        </span>
      </figcaption>

      <ol aria-hidden className="grid grid-cols-1 divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {JOURNEY.map((station, index) => {
          const color = STATION_COLORS[station.status];
          const here = state.patients.filter((patient) => patient.station === index).sort((a, b) => a.no - b.no);

          return (
            <li
              key={station.status}
              className="flex min-w-0 items-center gap-3 px-3 py-2.5 sm:min-h-44 sm:flex-col sm:items-stretch sm:py-3">
              <div className="flex w-24 shrink-0 items-center gap-1.5 sm:w-auto">
                <span className={cn('size-2 shrink-0 rounded-full', color.line)} />
                <span className="truncate text-xs font-semibold">{t(`journey.${station.status}.label`)}</span>
                <span className="tabular ml-auto text-xs text-muted-foreground">
                  {index === BOARD_DONE ? state.served : here.length}
                </span>
              </div>
              <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5 sm:flex-col sm:flex-nowrap">
                {here.map((patient) => (
                  <li
                    // A new key per station: moving re-enters, so the chip slides in where it arrived.
                    key={`${patient.no}:${station.status}`}
                    className={cn(
                      'site-arrive flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs',
                      color.soft,
                      index === BOARD_DONE && 'opacity-70',
                    )}>
                    <span className={cn('tabular font-semibold', color.text)}>
                      A-{String(patient.no).padStart(3, '0')}
                    </span>
                    <span className="truncate text-foreground/80">{patient.name}</span>
                    {patient.bpjs && (
                      <span className="ml-auto hidden rounded bg-bpjs-soft px-1 text-[0.625rem] leading-4 font-semibold text-bpjs sm:inline">
                        BPJS
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
