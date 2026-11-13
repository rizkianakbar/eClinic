'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { INTL_LOCALE } from '@/i18n/locales';
import { formatRupiah, formatRupiahCompact } from '@/lib/money';
import { cn } from '@/lib/utils';

type Metric = {
  key: string;
  label: string;
  /** Today's value, already formatted. */
  value: string;
  /** % vs yesterday; null when there is nothing to compare. */
  delta: number | null;
  hint: string;
  /** Last 14 days, oldest first; the last entry is today. */
  series: { day: string; value: number }[];
  unit: 'rupiah' | 'count';
};

type HomeOwnerTrendProps = {
  metrics: Metric[];
};

/**
 * The headline numbers are the chart's tabs (Vercel/Stripe analytics):
 * pick a metric, the 14-day chart below follows. Today's bar is solid.
 */
export function HomeOwnerTrend(props: HomeOwnerTrendProps) {
  const t = useTranslations('home.trend');
  const locale = useLocale();
  const weekday = new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: 'short', timeZone: 'UTC' });
  const dayLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const [selected, setSelected] = useState(props.metrics[0].key);
  const metric = props.metrics.find((entry) => entry.key === selected) ?? props.metrics[0];
  const peak = Math.max(1, ...metric.series.map((entry) => entry.value));
  const format = (value: number) => (metric.unit === 'rupiah' ? formatRupiahCompact(value, locale) : String(value));

  const formatFull = (value: number) =>
    metric.unit === 'rupiah' ? formatRupiah(value) : t('patients', { count: value });

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div
        role="tablist"
        aria-label={t('pick')}
        className="grid border-b"
        style={{ gridTemplateColumns: `repeat(${props.metrics.length}, minmax(0, 1fr))` }}>
        {props.metrics.map((entry) => {
          const active = entry.key === metric.key;

          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(entry.key)}
              className={cn(
                'relative flex min-w-0 flex-col items-start gap-1 border-r px-3 py-3 text-left sm:px-5 sm:py-4 transition-colors last:border-r-0',
                active ? 'bg-card' : 'bg-card hover:bg-muted/40',
              )}>
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 -bottom-px h-0.5 bg-primary transition-opacity duration-200',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span
                className={cn('text-[0.8125rem] font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                {entry.label}
              </span>
              <span
                className={cn(
                  'numeral max-w-full truncate text-[1.75rem] transition-colors',
                  !active && 'text-muted-foreground',
                )}>
                {entry.value}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {entry.delta !== null && (
                  <span
                    className={cn(
                      'tabular rounded px-1.5 leading-5 font-semibold',
                      entry.delta >= 0
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-status-cancelled-soft text-status-cancelled',
                    )}>
                    {entry.delta >= 0 ? '▲' : '▼'} {Math.abs(entry.delta)}%
                  </span>
                )}
                {entry.delta !== null ? t('fromYesterday') : ''}
                {entry.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <div className="relative flex-1 pl-16" style={{ minHeight: '11rem' }}>
          {/* Grid lines with their values, so the bars can be read without hovering. */}
          {[1, 0.5, 0].map((fraction) => (
            <div
              key={fraction}
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ bottom: `${fraction * 100}%`, transform: 'translateY(50%)' }}
              aria-hidden>
              <span className="tabular w-14 shrink-0 text-right text-[0.6875rem] whitespace-nowrap text-muted-foreground">
                {format(Math.round(peak * fraction))}
              </span>
              <span
                className={cn('h-px flex-1', fraction === 0 ? 'bg-border' : 'border-t border-dashed border-border')}
              />
            </div>
          ))}
          <ol className="relative flex h-full items-end gap-1.5" aria-label={t('lastDays', { label: metric.label })}>
            {metric.series.map((entry, index) => {
              const today = index === metric.series.length - 1;

              return (
                <li key={entry.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-md bg-foreground px-2 py-1 text-[0.6875rem] whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                    style={{ bottom: `${Math.max(2, (entry.value / peak) * 100)}%` }}>
                    {dayLabel.format(new Date(entry.day))} · {formatFull(entry.value)}
                  </span>
                  <span
                    className={cn(
                      'w-full rounded-t-[3px] transition-[background-color,height] duration-300 ease-out',
                      entry.value === 0
                        ? 'bg-transparent'
                        : today
                          ? 'bg-primary'
                          : 'bg-primary/30 group-hover:bg-primary/55',
                    )}
                    style={{ height: `${(entry.value / peak) * 100}%` }}
                  />
                  <span className="sr-only">
                    {entry.day}: {formatFull(entry.value)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <ol className="mt-2 flex gap-1.5 pl-16 text-center text-[0.6875rem] text-muted-foreground" aria-hidden>
          {metric.series.map((entry, index) => (
            <li
              key={entry.day}
              className={cn(
                'min-w-0 flex-1 whitespace-nowrap',
                index === metric.series.length - 1 && 'font-semibold text-foreground max-sm:text-right',
                // Phones: every third day, counted back from today, so the labels never crowd.
                (metric.series.length - 1 - index) % 3 !== 0 && 'max-sm:invisible',
              )}>
              {index === metric.series.length - 1 ? t('today') : weekday.format(new Date(entry.day))}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
