import { CalendarIcon, ChevronRightIcon, StethoscopeIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { listPatientVisits } from './visits.service';
import { VisitsStatusBadge } from './visits-status-badge';

type VisitsHistoryProps = {
  visits: Awaited<ReturnType<typeof listPatientVisits>>;
  /** Primary diagnosis per visit id; empty for roles that may not read diagnoses. */
  diagnoses: Map<string, { code: string; name: string }>;
  /** Clinical roles open the full record; others the visit summary. */
  hrefFor: (visitId: string) => string;
};

const day = new Intl.DateTimeFormat('id-ID', { day: 'numeric', timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' });
const year = new Intl.DateTimeFormat('id-ID', { year: 'numeric', timeZone: 'UTC' });

/** Visits as a timeline, newest first: when, where, with whom, why, and how it ended. */
export function VisitsHistory(props: VisitsHistoryProps) {
  if (props.visits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-6 py-12 text-center">
        <CalendarIcon className="mb-1 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Belum pernah berkunjung</p>
        <p className="text-[0.8125rem] text-muted-foreground">Kunjungan yang didaftarkan akan tercatat di sini.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {props.visits.map((visit, index) => {
        const date = new Date(visit.visit_date);
        const diagnosis = props.diagnoses.get(visit.id);
        const last = index === props.visits.length - 1;
        const newYear = index === 0 || props.visits[index - 1].visit_date.slice(0, 4) !== visit.visit_date.slice(0, 4);

        return (
          <li key={visit.id} className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4">
            {/* The timeline rail */}
            {!last && <span aria-hidden className="absolute top-14 bottom-0 left-7 w-px -translate-x-1/2 bg-border" />}
            <div className="flex flex-col items-center pt-1">
              <span className="flex size-12 flex-col items-center justify-center rounded-xl border bg-card leading-none shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
                <span className="numeral text-lg">{day.format(date)}</span>
                <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase">
                  {month.format(date)}
                </span>
              </span>
              {newYear && (
                <span className="tabular mt-1 text-[0.6875rem] text-muted-foreground">{year.format(date)}</span>
              )}
            </div>
            <Link
              href={props.hrefFor(visit.id)}
              className={cn(
                'group mb-3 flex items-start gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-colors hover:border-input',
                visit.status === 'cancelled' && 'opacity-70',
              )}>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{visit.poli?.name ?? '-'}</span>
                  <VisitsStatusBadge status={visit.status} />
                  {visit.payer_type === 'bpjs' && (
                    <span className="rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
                      BPJS
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
                  <StethoscopeIcon className="size-3.5" aria-hidden />
                  {visit.doctor?.full_name ?? '-'} · antrean {visit.queue_no}
                </p>
                {diagnosis && (
                  <p className="flex items-baseline gap-2 text-sm">
                    <span className="tabular shrink-0 rounded-md bg-muted px-1.5 text-xs font-semibold">
                      {diagnosis.code}
                    </span>
                    <span className="min-w-0">{diagnosis.name}</span>
                  </p>
                )}
                {visit.cancel_reason && (
                  <p className="text-[0.8125rem] text-status-cancelled">Batal: {visit.cancel_reason}</p>
                )}
              </div>
              <ChevronRightIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
