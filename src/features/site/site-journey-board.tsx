'use client';

import { ArrowRightIcon, RotateCcwIcon, UserPlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { JOURNEY } from '@/features/visits/visits.constants';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { cn } from '@/lib/utils';
import { addVisitor, BOARD_DONE, BOARD_START, BOARD_TICK_MS, nextBoard } from './site.lib';

/**
 * The hero's living example of the product's signature: a queue board where patients move through the five
 * stations, in the journey colours. The visitor can join as a patient ("Coba: daftarkan pasien") and follow their own
 * visit, with a line at each desk on what the clinic does there; at home, the invitation to register. Reduced motion:
 * the board holds still, and a registered visitor appears at each step as they press again.
 */
export function SiteJourneyBoard() {
  const t = useTranslations();
  const [state, setState] = useState({ patients: BOARD_START, served: 21, tick: 0 });
  const [still, setStill] = useState(false);
  const visitor = state.patients.find((patient) => patient.you);
  const visitorStation = visitor ? JOURNEY[visitor.station].status : null;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setStill(reduced);
    if (reduced) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;

      setState((current) => {
        const next = nextBoard(current.patients, current.tick);

        return { patients: next.patients, served: current.served + next.served, tick: current.tick + 1 };
      });
    }, BOARD_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  function register() {
    // A fresh visit starts on an even tick, so the first move comes on the next step.
    setState((current) => ({
      ...current,
      patients: addVisitor(current.patients, t('site.board.you.name')),
      tick: current.tick % 2 === 0 ? current.tick + 1 : current.tick,
    }));
  }

  // Without motion, each press moves the visitor one desk on.
  function step() {
    setState((current) => {
      const next = nextBoard(current.patients, current.tick % 2 === 0 ? current.tick : current.tick + 1);

      return { patients: next.patients, served: current.served + next.served, tick: current.tick + 2 };
    });
  }

  const walking = visitor && visitor.station < BOARD_DONE;

  return (
    <figure
      aria-label={t('site.board.label')}
      className="relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04),0_24px_48px_-24px_rgb(15_47_40/0.25)]">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {t('site.board.title')}
          <span className="rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
            {t('site.board.poli')}
          </span>
          <span className="hidden items-center gap-1.5 text-xs font-medium text-primary sm:inline-flex">
            <span className="signal-pulse size-1.5 rounded-full bg-current" aria-hidden />
            {t('common.live')}
          </span>
        </span>
        {still && walking ? (
          <button type="button" onClick={step} className={buttonVariants({ size: 'sm' })}>
            {t('site.board.you.next')}
            <ArrowRightIcon aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={register}
            disabled={Boolean(walking)}
            className={cn(
              buttonVariants({ size: 'sm', variant: visitor ? 'outline' : 'default' }),
              !visitor && 'shadow-[0_0_0_4px_rgb(23_115_92/0.12)]',
            )}>
            {visitor ? <RotateCcwIcon aria-hidden /> : <UserPlusIcon aria-hidden />}
            {visitor ? t('site.board.you.again') : t('site.board.you.try')}
          </button>
        )}
      </figcaption>

      <ol aria-hidden className="grid grid-cols-1 divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {JOURNEY.map((station, index) => {
          const color = STATION_COLORS[station.status];
          const here = state.patients.filter((patient) => patient.station === index).sort((a, b) => a.no - b.no);

          return (
            <li
              key={station.status}
              className={cn(
                'flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors duration-500 sm:min-h-44 sm:flex-col sm:items-stretch sm:py-3',
                visitorStation === station.status && 'bg-secondary/40',
              )}>
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
                      patient.you
                        ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgb(23_115_92/0.7)] ring-2 ring-primary/25'
                        : color.soft,
                      // Gone home: quieter, but never faded below readable contrast.
                      index === BOARD_DONE && !patient.you && 'bg-muted',
                    )}>
                    <span className={cn('tabular font-semibold', patient.you ? 'text-primary-foreground' : color.text)}>
                      A-{String(patient.no).padStart(3, '0')}
                    </span>
                    <span className={cn('truncate', patient.you ? 'font-semibold' : 'text-foreground/80')}>
                      {patient.name}
                    </span>
                    {patient.bpjs && !patient.you && (
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

      {/* The visitor's own visit, desk by desk: what the clinic does for them there. */}
      {visitorStation && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t bg-muted/40 px-4 py-3">
          <p key={visitorStation} className="reveal flex min-w-0 items-start gap-2.5 text-sm">
            <span
              className={cn('mt-1.5 size-2 shrink-0 rounded-full', STATION_COLORS[visitorStation].line)}
              aria-hidden
            />
            <span>
              <span className={cn('font-semibold', STATION_COLORS[visitorStation].text)}>
                {t(`journey.${visitorStation}.label`)}.
              </span>{' '}
              <span className="text-muted-foreground">{t(`site.board.you.steps.${visitorStation}`)}</span>
            </span>
          </p>
          {visitorStation === 'done' && (
            <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }), 'reveal group')}>
              {t('site.board.you.cta')}
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </figure>
  );
}
