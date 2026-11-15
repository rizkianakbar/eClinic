'use client';

import { ArrowRightIcon, LoaderCircleIcon, MapPinIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSwitchBranch } from '@/features/branches/branches.hooks';
import { JOURNEY, type JourneyStatus } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';

type CompanyBranchCardProps = {
  id: string;
  name: string;
  address: string | null;
  counts: Record<JourneyStatus, number>;
  revenue: number;
  bpjs: number;
  /** Last days of revenue, oldest first; today last. */
  series: { day: string; revenue: number; patients: number }[];
};

/**
 * One branch at a glance (Vercel's project card): where its patients are now on the journey line, today's money
 * and patients, two weeks of revenue. The whole card opens the branch.
 */
export function CompanyBranchCard(props: CompanyBranchCardProps) {
  const t = useTranslations();
  const open = useSwitchBranch();
  const busy = open.isPending || open.isSuccess;
  const patients = Object.values(props.counts).reduce((sum, count) => sum + count, 0);
  const peak = Math.max(1, ...props.series.map((entry) => entry.revenue));

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => open.mutate(props.id)}
      aria-label={t('company.overview.openBranch', { branch: props.name })}
      className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-[0_1px_2px_rgb(20_32_29/0.04)] outline-none transition-[border-color,box-shadow] hover:border-input hover:shadow-[0_1px_2px_rgb(20_32_29/0.04),0_8px_24px_-16px_rgb(15_47_40/0.35)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-70">
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <MapPinIcon className="size-4.5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{props.name}</span>
          <span className="truncate text-[0.8125rem] text-muted-foreground">
            {props.address ?? t('company.noAddress')}
          </span>
        </span>
        {busy ? (
          <LoaderCircleIcon className="mt-1 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <ArrowRightIcon
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        )}
      </div>

      {/* The journey line of this branch now: each station's share of today's patients, in its colour. */}
      <div className="flex flex-col gap-2 px-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          {JOURNEY.map((station) => (
            <span
              key={station.status}
              className={STATION_COLORS[station.status].line}
              style={{ width: `${patients ? (props.counts[station.status] / patients) * 100 : 0}%` }}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {JOURNEY.map((station) => (
            <li key={station.status} className="flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', STATION_COLORS[station.status].line)} aria-hidden />
              {t(`journey.${station.status}.short`)}
              <span className="tabular font-semibold text-foreground">{props.counts[station.status]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t bg-muted/30 px-4 py-3">
        <dl className="flex gap-6">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{t('company.overview.revenueToday')}</dt>
            <dd className="tabular font-semibold">{formatRupiah(props.revenue)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{t('company.overview.patientsToday')}</dt>
            <dd className="tabular font-semibold">
              {patients}
              {props.bpjs > 0 && (
                <span className="ml-1.5 text-xs font-medium text-bpjs">
                  {t('home.owner.bpjsCount', { count: props.bpjs })}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <div className="flex h-8 w-24 items-end gap-0.5" aria-hidden>
          {props.series.map((entry, index) => (
            <span
              key={entry.day}
              className={cn('flex-1 rounded-[1px]', index === props.series.length - 1 ? 'bg-primary' : 'bg-primary/20')}
              style={{ height: `${Math.max(4, (entry.revenue / peak) * 100)}%` }}
            />
          ))}
        </div>
      </div>
    </button>
  );
}
