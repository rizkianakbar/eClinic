import { ChevronRightIcon, HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { PageLinks } from '@/components/ui/page-links';
import { PanelEmpty } from '@/components/ui/panel';
import { icd10Name } from '@/features/exam/exam.lib';
import { ageInYears } from '@/features/patients/patients.lib';
import { daysBetween, formatDate, formatTime, relativeDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
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
  const t = useTranslations();
  const locale = useLocale();
  const days = new Map<string, Visit[]>();

  for (const visit of props.visits) days.set(visit.visit_date, [...(days.get(visit.visit_date) ?? []), visit]);

  if (props.visits.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <PanelEmpty icon={<HistoryIcon />} title={t('visits.list.empty')} description={t('visits.list.emptyHint')} />
      </div>
    );
  }

  const first = (props.page - 1) * VISIT_HISTORY_PAGE_SIZE + 1;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.8125rem] text-muted-foreground">
        {t.rich('visits.list.summary', {
          from: first,
          to: first + props.visits.length - 1,
          total: props.total,
          b: (chunks) => <span className="tabular font-medium text-foreground">{chunks}</span>,
        })}
      </p>

      {[...days].map(([day, visits]) => {
        // Today and yesterday are named; older days are just the date.
        const recent = daysBetween(day, props.today) <= 1;

        return (
          <section key={day} className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <header className="sticky top-[3.3rem] z-10 flex items-center justify-between gap-3 rounded-t-xl border-b bg-card/95 px-4 py-2.5 backdrop-blur">
              <h2 className="text-sm font-semibold">
                {recent
                  ? `${relativeDay(day, props.today, locale)}, ${formatDate(day, locale)}`
                  : formatDate(day, locale)}
              </h2>
              <span className="tabular text-xs text-muted-foreground">
                {t('visits.list.dayCount', { count: visits.length })}
              </span>
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
                          {t('patients.mrn')} <span className="tabular">{visit.patient.mrn}</span> ·{' '}
                          {t(`sex.${visit.patient.sex as 'male' | 'female'}`)},{' '}
                          {t('patients.ageShort', { age: ageInYears(visit.patient.birth_date, props.today) })} ·{' '}
                          {visit.poli?.name} · {visit.doctor?.full_name}
                        </span>
                        {props.clinical && (
                          <span className="block truncate text-[0.8125rem]">
                            {diagnosis ? (
                              <>
                                <span className="tabular font-semibold text-foreground/70">{diagnosis.icd10_code}</span>{' '}
                                {icd10Name(diagnosis.icd10, locale)}
                              </>
                            ) : (
                              <span className="text-muted-foreground">{t('visits.list.noDiagnosis')}</span>
                            )}
                          </span>
                        )}
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className={cn('block text-xs font-medium', color.text)}>
                          {t(`visitStatus.${visit.status}`)}
                        </span>
                        <span className="tabular block text-xs text-muted-foreground">
                          {formatTime(visit.created_at, locale)}
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
        countLabel={t('visits.list.countLabel', { count: props.total })}
      />
    </div>
  );
}
