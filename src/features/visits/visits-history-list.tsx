import { ChevronRightIcon, HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { PageLinks } from '@/components/ui/page-links';
import { PanelEmpty } from '@/components/ui/panel';
import { SEX_LABELS } from '@/features/patients/patients.constants';
import { ageInYears } from '@/features/patients/patients.lib';
import { formatDate, formatTime, relativeDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { VISIT_STATUS_LABELS } from './visits.constants';
import { VISIT_HISTORY_PAGE_SIZE } from './visits.lib';
import type { listVisitHistory } from './visits.service';
import { STATION_COLORS } from './visits-journey-line';

type History = Awaited<ReturnType<typeof listVisitHistory>>;
type Visit = History['visits'][number];

type VisitsHistoryListProps = History & {
  page: number;
  today: string;
  /** Clinical roles see the primary diagnosis. */
  clinical: boolean;
  /** Search params to keep in the page links. */
  params: Record<string, string>;
};

/** The station colour of a visit's status; cancelled visits are grey. */
function tone(status: Visit['status']) {
  if (status === 'cancelled') return { soft: 'bg-muted', text: 'text-muted-foreground' };

  return STATION_COLORS[status === 'registered' ? 'waiting' : status];
}

/**
 * Who came for treatment, newest first, grouped by day: queue number in the colour of where the visit
 * stands, the patient, poli and doctor, the primary diagnosis (clinical roles) and the status.
 */
export function VisitsHistoryList(props: VisitsHistoryListProps) {
  const days = new Map<string, Visit[]>();

  for (const visit of props.visits) days.set(visit.visit_date, [...(days.get(visit.visit_date) ?? []), visit]);

  if (props.visits.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <PanelEmpty
          icon={<HistoryIcon />}
          title="Tidak ada kunjungan"
          description="Coba perlebar periode, atau hapus kata pencarian."
        />
      </div>
    );
  }

  const first = (props.page - 1) * VISIT_HISTORY_PAGE_SIZE + 1;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.8125rem] text-muted-foreground">
        Kunjungan{' '}
        <span className="tabular font-medium text-foreground">
          {first.toLocaleString('id-ID')}–{(first + props.visits.length - 1).toLocaleString('id-ID')}
        </span>{' '}
        dari <span className="tabular font-medium text-foreground">{props.total.toLocaleString('id-ID')}</span>, terbaru
        di atas.
      </p>

      {[...days].map(([day, visits]) => {
        const relative = relativeDay(day, props.today);

        return (
          <section key={day} className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <header className="sticky top-[3.3rem] z-10 flex items-center justify-between gap-3 rounded-t-xl border-b bg-card/95 px-4 py-2.5 backdrop-blur">
              <h2 className="text-sm font-semibold">
                {relative === 'Hari ini' || relative === 'Kemarin'
                  ? `${relative}, ${formatDate(day)}`
                  : formatDate(day)}
              </h2>
              <span className="tabular text-xs text-muted-foreground">{visits.length} kunjungan</span>
            </header>
            <ol className="divide-y">
              {visits.map((visit) => {
                const color = tone(visit.status);
                const diagnosis = visit.diagnoses[0];

                return (
                  <li key={visit.id}>
                    <Link
                      href={`/visits/${visit.id}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                      <span
                        className={cn(
                          'numeral flex size-10 shrink-0 items-center justify-center rounded-lg text-lg',
                          color.soft,
                          color.text,
                        )}>
                        {visit.queue_no}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{visit.patient.full_name}</span>
                          {visit.payer_type === 'bpjs' && (
                            <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
                              BPJS
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[0.8125rem] text-muted-foreground">
                          RM <span className="tabular">{visit.patient.mrn}</span> ·{' '}
                          {SEX_LABELS[visit.patient.sex as keyof typeof SEX_LABELS]},{' '}
                          {ageInYears(visit.patient.birth_date, props.today)} th · {visit.poli?.name} ·{' '}
                          {visit.doctor?.full_name}
                        </span>
                        {props.clinical && (
                          <span className="block truncate text-[0.8125rem]">
                            {diagnosis ? (
                              <>
                                <span className="tabular font-semibold text-foreground/70">{diagnosis.icd10_code}</span>{' '}
                                {diagnosis.icd10?.name_id ?? diagnosis.icd10?.name}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Belum ada diagnosis utama</span>
                            )}
                          </span>
                        )}
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className={cn('block text-xs font-medium', color.text)}>
                          {VISIT_STATUS_LABELS[visit.status]}
                        </span>
                        <span className="tabular block text-xs text-muted-foreground">
                          {formatTime(visit.created_at)}
                        </span>
                      </span>
                      <ChevronRightIcon
                        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <PageLinks
        page={props.page}
        pageSize={VISIT_HISTORY_PAGE_SIZE}
        total={props.total}
        params={props.params}
        noun="kunjungan"
      />
    </div>
  );
}
