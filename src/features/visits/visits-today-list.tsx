'use client';

import { UserRoundSearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatTime } from '@/lib/dates';
import type { Database } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';
import { JOURNEY, journeyIndex } from './visits.lib';
import { STATION_COLORS } from './visits-journey-line';
import { VisitsStatusBadge } from './visits-status-badge';

type VisitStatus = Database['public']['Enums']['visit_status'];

type TodayVisit = {
  id: string;
  patient_id: string;
  queue_no: number;
  status: VisitStatus;
  payer_type: string;
  created_at: string;
  skipped_at: string | null;
  patient: { full_name: string; mrn: string } | null;
  poli: { name: string } | null;
  doctor: { full_name: string } | null;
};

const FILTERS = ['all', 'waiting', 'served', 'done', 'cancelled'] as const;

type Filter = (typeof FILTERS)[number];

const MATCH: Record<Filter, (status: VisitStatus) => boolean> = {
  all: () => true,
  waiting: (status) => status === 'waiting' || status === 'registered',
  served: (status) => status === 'in_exam' || status === 'to_pharmacy' || status === 'to_cashier',
  done: (status) => status === 'done',
  cancelled: (status) => status === 'cancelled',
};

type VisitsTodayListProps = {
  visits: TodayVisit[];
};

/** Everyone registered today, newest first, filterable by where they are. */
export function VisitsTodayList(props: VisitsTodayListProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>('all');
  const count = (key: Filter) => props.visits.filter((visit) => MATCH[key](visit.status)).length;

  const rows = [...props.visits]
    .filter((visit) => MATCH[filter](visit.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <section aria-label={t('visits.today.title')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {t('visits.today.title')}
          <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
            {props.visits.length}
          </span>
        </h2>
        <SegmentedControl
          label={t('visits.today.filter')}
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((value) => ({ value, label: `${t(`visits.today.${value}`)} ${count(value)}` }))}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
            <UserRoundSearchIcon className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">
              {props.visits.length === 0 ? t('visits.today.empty') : t('visits.today.emptyFilter')}
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((visit) => {
              const step = journeyIndex(visit.status);
              const color = step >= 0 ? STATION_COLORS[JOURNEY[step].status] : null;

              return (
                <li key={visit.id} className="border-b last:border-0">
                  <Link
                    href={`/patients/${visit.patient_id}`}
                    className={cn(
                      'grid grid-cols-[2.75rem_2.25rem_minmax(0,1fr)_6.5rem] items-center gap-3 px-4 py-2.5 hover:bg-muted/50 md:grid-cols-[2.75rem_2.25rem_minmax(0,1.3fr)_minmax(0,1fr)_3.5rem_6.5rem]',
                      visit.status === 'cancelled' && 'opacity-60',
                    )}>
                    <span className="tabular text-[0.8125rem] text-muted-foreground">
                      {formatTime(visit.created_at, locale)}
                    </span>
                    <span
                      className={cn(
                        'numeral flex size-9 items-center justify-center rounded-lg text-[0.9375rem]',
                        color ? cn(color.soft, color.text) : 'bg-muted text-muted-foreground',
                      )}>
                      {visit.queue_no}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{visit.patient?.full_name}</span>
                      <span className="tabular block text-xs text-muted-foreground">
                        {t('patients.mrn')} {visit.patient?.mrn}
                      </span>
                    </span>
                    <span className="hidden min-w-0 md:block">
                      <span className="block truncate text-sm">{visit.poli?.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{visit.doctor?.full_name}</span>
                    </span>
                    <span className="hidden md:block">
                      {visit.payer_type === 'bpjs' ? (
                        <span className="rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
                          BPJS
                        </span>
                      ) : (
                        <span className="text-[0.8125rem] text-muted-foreground">{t('payer.umum')}</span>
                      )}
                    </span>
                    <span className="flex items-center justify-end gap-2">
                      {visit.skipped_at && visit.status === 'waiting' && (
                        <span className="text-xs font-medium text-status-cancelled">{t('visits.today.skipped')}</span>
                      )}
                      <VisitsStatusBadge status={visit.status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
