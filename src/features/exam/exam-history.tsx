import { HistoryIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/lib/dates';
import { icd10Name } from './exam.lib';
import type { listPreviousVisits } from './exam.service';

type ExamHistoryProps = {
  visits: Awaited<ReturnType<typeof listPreviousVisits>>;
};

/** Previous visits as a timeline: diagnoses, medicines, and the signed assessment/plan. */
export function ExamHistory(props: ExamHistoryProps) {
  const t = useTranslations('exam.history');
  const locale = useLocale();

  if (props.visits.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
        <HistoryIcon className="size-4 shrink-0" aria-hidden />
        {t('first')}
      </div>
    );
  }

  return (
    <ol className="relative flex flex-col gap-5 border-l pl-5">
      {props.visits.map((visit) => {
        const notes = visit.notes.filter((note) => note.signed_at);
        const diagnoses = [...visit.diagnoses].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));

        // One prescription per visit (unique visit_id), so it arrives as an object.
        const medicines = (visit.prescriptions?.items ?? []).map(
          (item) => `${item.medicine?.name} ${item.qty} ${item.medicine?.unit}`,
        );

        return (
          <li key={visit.id} className="relative text-sm">
            <span
              className="absolute top-1.5 -left-6.75 size-2.5 rounded-full border-2 border-card bg-input"
              aria-hidden
            />
            <p className="font-semibold">{formatDate(visit.visit_date, locale)}</p>
            <p className="mb-2 text-[0.8125rem] text-muted-foreground">
              {visit.poli?.name} · {visit.doctor?.full_name}
            </p>
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
              {diagnoses.map((diagnosis) => (
                <p key={diagnosis.icd10_code} className="flex gap-2">
                  <span className="tabular shrink-0 text-xs leading-5 font-semibold">{diagnosis.icd10_code}</span>
                  <span>
                    {icd10Name(diagnosis.icd10, locale)}
                    {diagnosis.is_primary && <span className="text-muted-foreground">{t('primary')}</span>}
                  </span>
                </p>
              ))}
              {medicines.length > 0 && (
                <p>
                  <span className="text-muted-foreground">{t('medicines')}</span>
                  {medicines.join(', ')}
                </p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="text-muted-foreground">
                  {note.assessment && (
                    <p>
                      <span className="font-semibold text-foreground">A</span> {note.assessment}
                    </p>
                  )}
                  {note.plan && (
                    <p>
                      <span className="font-semibold text-foreground">P</span> {note.plan}
                    </p>
                  )}
                </div>
              ))}
              {diagnoses.length === 0 && notes.length === 0 && medicines.length === 0 && (
                <p className="text-muted-foreground">{t('none')}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
