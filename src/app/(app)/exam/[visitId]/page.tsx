import {
  CheckIcon,
  ChevronLeftIcon,
  FilePenLineIcon,
  FileTextIcon,
  HeartPulseIcon,
  HistoryIcon,
  ListChecksIcon,
  LockIcon,
  type LucideIcon,
  NotebookPenIcon,
  PillIcon,
  StethoscopeIcon,
  SyringeIcon,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { z } from 'zod';
import { EXAM_VIEWER_ROLES, SOAP_FIELDS } from '@/features/exam/exam.constants';
import {
  getExamVisit,
  listDiagnoses,
  listLetters,
  listPreviousVisits,
  listProcedureOptions,
  listProcedures,
  listSoapNotes,
  listVitals,
} from '@/features/exam/exam.service';
import { ExamAmendments } from '@/features/exam/exam-amendments';
import { ExamDiagnoses } from '@/features/exam/exam-diagnoses';
import { ExamDraftsProvider } from '@/features/exam/exam-drafts';
import { ExamHistory } from '@/features/exam/exam-history';
import { ExamLetters } from '@/features/exam/exam-letters';
import { ExamProcedures } from '@/features/exam/exam-procedures';
import { ExamSection } from '@/features/exam/exam-section';
import { ExamHistorySkeleton } from '@/features/exam/exam-skeleton';
import { ExamSoapForm } from '@/features/exam/exam-soap-form';
import { SoapText } from '@/features/exam/exam-soap-sheet';
import { ExamVitals } from '@/features/exam/exam-vitals';
import { ExamVitalsDialog } from '@/features/exam/exam-vitals-dialog';
import { ageInYears, initials } from '@/features/patients/patients.lib';
import { getPrescription } from '@/features/prescriptions/prescriptions.service';
import { PrescriptionsEditor } from '@/features/prescriptions/prescriptions-editor';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { formatDateTime, todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const generateMetadata = pageTitle('exam.title');

export default async function ExamPage(props: PageProps<'/exam/[visitId]'>) {
  const session = await requireRole(...EXAM_VIEWER_ROLES);
  const { visitId } = await props.params;

  if (!z.uuid().safeParse(visitId).success) notFound();

  const supabase = await createClient();
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  const [visit, vitals, soap, diagnoses, prescription, procedures, letters, procedureOptions] = await Promise.all([
    getExamVisit(supabase, visitId),
    listVitals(supabase, visitId),
    listSoapNotes(supabase, visitId),
    listDiagnoses(supabase, visitId),
    getPrescription(supabase, visitId),
    listProcedures(supabase, visitId),
    listLetters(supabase, visitId),
    listProcedureOptions(supabase),
  ]);

  if (!visit?.patient) notFound();

  // Needs the patient id, so it is a second round trip: it streams into the side panel instead of holding the record.
  const history = listPreviousVisits(supabase, visit.patient.id, visit.id);

  const isOwnDoctor = session.role === 'doctor' && visit.doctor_id === session.userId;
  const signed = Boolean(soap.main?.signed_at);
  const editable = isOwnDoctor && visit.status === 'in_exam' && !signed;

  const canRecordVitals =
    (session.role === 'nurse' || isOwnDoctor) && (visit.status === 'waiting' || visit.status === 'in_exam') && !signed;

  const { patient } = visit;
  const prescriptionCount = prescription.items.length + prescription.compounds.length;

  const hasNotes = Boolean(soap.main && SOAP_FIELDS.some((field) => soap.main?.[field.name]));
  const hasPrimary = diagnoses.some((diagnosis) => diagnosis.is_primary);

  const checklist = [
    { href: '#soap', label: t('exam.check.soap'), done: hasNotes, required: true },
    { href: '#diagnosis', label: t('exam.check.diagnosis'), done: hasPrimary, required: true },
    {
      href: '#resep',
      label: prescriptionCount
        ? t('exam.check.rx', { count: prescriptionCount })
        : visit.no_medicine_reason
          ? t('exam.check.noMedicine')
          : t('exam.check.rxOrNone'),
      done: prescriptionCount > 0 || Boolean(visit.no_medicine_reason),
      required: true,
    },
    {
      href: '#tindakan',
      label: procedures.length
        ? t('exam.check.proceduresCount', { count: procedures.length })
        : t('exam.check.procedures'),
      done: procedures.length > 0,
      required: false,
    },
    {
      href: '#surat',
      label: letters.length ? t('exam.check.lettersCount', { count: letters.length }) : t('exam.check.letters'),
      done: letters.length > 0,
      required: false,
    },
    { href: '#soap', label: t('exam.check.sign'), done: signed, required: true },
  ];

  return (
    <div className={editable ? 'flex flex-col gap-6 pb-28' : 'flex flex-col gap-6'}>
      <Link
        href="/queue"
        className="-mb-2 -ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        {t('nav.queue')}
      </Link>

      {/* Who is in the room, and where they are in today's visit. */}
      <header className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-lg font-semibold text-white">
            {initials(patient.full_name)}
            <span className="tabular absolute -right-1 -bottom-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-card px-1 text-[0.6875rem] font-semibold text-foreground shadow-[0_0_0_1px_var(--border)]">
              {visit.queue_no}
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[1.375rem] leading-tight font-semibold tracking-tight">
                {patient.full_name}
              </h1>
              <span
                className={cn(
                  'rounded-md px-1.5 text-xs leading-5 font-medium',
                  visit.payer_type === 'bpjs' ? 'bg-bpjs-soft text-bpjs' : 'bg-muted text-muted-foreground',
                )}>
                {t(`payer.${visit.payer_type as 'umum' | 'bpjs'}`)}
              </span>
              {signed && (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 text-xs leading-5 font-medium text-secondary-foreground">
                  <LockIcon className="size-3" aria-hidden />
                  {t('exam.signed')}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t(`sex.${patient.sex as 'male' | 'female'}`)},{' '}
              {t('patients.ageLong', { age: ageInYears(patient.birth_date) })}
              <Dot />
              {t('patients.mrn')} <span className="tabular font-medium text-foreground">{patient.mrn}</span>
              <Dot />
              {visit.poli?.name}
              <Dot />
              <Suspense
                fallback={<span className="inline-block h-3 w-24 animate-pulse rounded bg-muted align-middle" />}>
                <HistoryCount history={history} />
              </Suspense>
            </p>
          </div>
        </div>
        <VisitsJourneyPosition status={visit.status} className="w-full max-w-md" />
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ExamDraftsProvider>
          <div className="flex min-w-0 flex-col gap-4">
            <ExamSection
              id="soap"
              icon={NotebookPenIcon}
              title={t('exam.section.soap')}
              description={
                signed
                  ? t('exam.section.soapSigned', {
                      name: soap.main?.author?.full_name ?? '',
                      when: formatDateTime(soap.main!.signed_at!, locale),
                    })
                  : t('exam.section.soapHint')
              }
              action={
                !signed &&
                soap.main &&
                !editable && <span className="text-xs font-medium text-status-waiting">{t('exam.section.draft')}</span>
              }
              flush>
              {editable ? (
                <ExamSoapForm
                  visitId={visit.id}
                  hasPrimaryDiagnosis={hasPrimary}
                  prescriptionCount={prescriptionCount}
                  noMedicine={Boolean(visit.no_medicine_reason)}
                  defaultValues={{
                    subjective: soap.main?.subjective ?? '',
                    objective: soap.main?.objective ?? '',
                    assessment: soap.main?.assessment ?? '',
                    plan: soap.main?.plan ?? '',
                  }}
                />
              ) : soap.main && hasNotes ? (
                <SoapText note={soap.main} />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  {visit.status === 'waiting' ? t('exam.section.notStarted') : t('exam.section.noNotes')}
                </p>
              )}
            </ExamSection>

            <ExamSection
              id="diagnosis"
              icon={StethoscopeIcon}
              title={t('exam.section.diagnosis')}
              description={t('exam.section.diagnosisHint')}
              meta={diagnoses.length || undefined}>
              <ExamDiagnoses visitId={visit.id} diagnoses={diagnoses} editable={editable} />
            </ExamSection>

            <ExamSection
              id="resep"
              icon={PillIcon}
              title={t('exam.section.rx')}
              description={prescriptionCount ? t('exam.section.rxForward') : t('exam.section.rxRequired')}
              meta={prescriptionCount || undefined}>
              <PrescriptionsEditor
                visitId={visit.id}
                prescription={prescription}
                editable={editable}
                noMedicineReason={visit.no_medicine_reason}
              />
            </ExamSection>

            <ExamSection
              id="tindakan"
              icon={SyringeIcon}
              title={t('exam.section.procedures')}
              description={t('exam.section.proceduresHint')}
              meta={procedures.length || undefined}>
              <ExamProcedures
                visitId={visit.id}
                procedures={procedures}
                options={procedureOptions}
                defaultPerformerId={visit.doctor_id}
                editable={editable}
              />
            </ExamSection>

            <ExamSection
              id="surat"
              icon={FileTextIcon}
              title={t('exam.section.letters')}
              description={t('exam.section.lettersHint')}
              meta={letters.length || undefined}>
              <ExamLetters
                visitId={visit.id}
                letters={letters}
                canIssue={isOwnDoctor && visit.status !== 'waiting' && visit.status !== 'cancelled'}
                today={todayInJakarta()}
                referralDefaults={{
                  clinical_summary: [soap.main?.subjective, soap.main?.objective].filter(Boolean).join('\n'),
                  therapy: [
                    ...prescription.items.map(
                      (item) => `${item.medicine?.name} ${item.qty} ${item.medicine?.unit} (${item.signa})`,
                    ),
                    ...prescription.compounds.map(
                      (compound) => `Racikan ${compound.form} ${compound.quantity} (${compound.signa})`,
                    ),
                  ].join('\n'),
                }}
              />
            </ExamSection>

            {signed && (soap.amendments.length > 0 || isOwnDoctor) && (
              <ExamSection
                id="amandemen"
                icon={FilePenLineIcon}
                title={t('exam.section.amendments')}
                description={t('exam.section.amendmentsHint')}
                meta={soap.amendments.length || undefined}>
                <ExamAmendments visitId={visit.id} amendments={soap.amendments} canAmend={isOwnDoctor} />
              </ExamSection>
            )}
          </div>
        </ExamDraftsProvider>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-19 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overscroll-contain xl:pb-1">
          <RailCard
            title={t('exam.rail.vitals')}
            icon={HeartPulseIcon}
            action={
              canRecordVitals && (
                <ExamVitalsDialog visitId={visit.id} patientName={patient.full_name} label={t('exam.rail.record')} />
              )
            }>
            <ExamVitals vitals={vitals} layout="rail" />
          </RailCard>

          <RailCard title={t('exam.rail.checklist')} icon={ListChecksIcon}>
            <ol className="flex flex-col gap-0.5">
              {checklist.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                    {item.done ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'size-5 rounded-full border-2',
                          item.required ? 'border-input' : 'border-dashed border-input',
                        )}
                        aria-hidden
                      />
                    )}
                    <span className={cn('flex-1', item.done ? 'text-foreground' : 'text-muted-foreground')}>
                      {item.label}
                    </span>
                    {!item.required && !item.done && (
                      <span className="text-xs text-muted-foreground/70">{t('exam.check.optional')}</span>
                    )}
                  </a>
                </li>
              ))}
            </ol>
          </RailCard>

          <RailCard title={t('exam.rail.history')} icon={HistoryIcon}>
            <Suspense fallback={<ExamHistorySkeleton />}>
              <HistoryList history={history} />
            </Suspense>
          </RailCard>
        </aside>
      </div>
    </div>
  );
}

type History = ReturnType<typeof listPreviousVisits>;

async function HistoryCount(props: { history: History }) {
  const visits = await props.history;

  const t = await getTranslations('exam.rail');

  return visits.length === 0 ? t('newPatient') : t('previousCount', { count: visits.length });
}

async function HistoryList(props: { history: History }) {
  return <ExamHistory visits={await props.history} />;
}

type RailCardProps = {
  title: string;
  icon: LucideIcon;
  meta?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
};

/** A side-panel card: what the doctor glances at while writing. */
function RailCard(props: RailCardProps) {
  const Icon = props.icon;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <header className="mb-3 flex min-h-7 items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" aria-hidden />
          {props.title}
          {props.meta !== undefined && (
            <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
              {props.meta}
            </span>
          )}
        </h2>
        {props.action}
      </header>
      {props.children}
    </section>
  );
}

function Dot() {
  return (
    <span className="mx-1.5 text-input" aria-hidden>
      ·
    </span>
  );
}
