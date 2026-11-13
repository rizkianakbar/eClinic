'use client';

import { CheckIcon, CircleAlertIcon, IdCardIcon, PhoneIcon, UserRoundIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import type { SearchPatient } from '@/features/patients/patients.hooks';
import { ageInYears, formatIdNumber, formatPhone, initials } from '@/features/patients/patients.lib';
import { PatientSearch } from '@/features/patients/patients-search';
import { toHourMinute } from '@/features/schedules/schedules.lib';
import { cn } from '@/lib/utils';
import type { VisitStatus } from './visits.constants';
import type { PracticeSession } from './visits.lib';
import { type RegisteredVisit, VisitsRegisterForm } from './visits-register-form';

type TodayEntry = {
  queueNo: number;
  poliName: string;
  status: VisitStatus;
};

type VisitsRegistrationDeskProps = {
  sessions: PracticeSession[];
  /** Jakarta "HH:MM" at render. */
  now: string;
  canManageSchedules: boolean;
  /** Patients already registered today (not cancelled), by patient id. */
  registeredToday: Record<string, TodayEntry>;
  /** What the right side shows before a patient is chosen. */
  idle: ReactNode;
  /** Under the search: today's registrations. */
  children: ReactNode;
};

type Ticket = RegisteredVisit & { patient: SearchPatient };

/**
 * The whole front-desk job on one screen: find the patient, choose the
 * doctor, register, read the queue number out. Keyboard: type, ↑↓, Enter to
 * choose, Enter to register, Enter for the next patient; Esc goes back.
 */
export function VisitsRegistrationDesk(props: VisitsRegistrationDeskProps) {
  const t = useTranslations('visits.desk');
  const [selected, setSelected] = useState<SearchPatient | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [round, setRound] = useState(0);

  function next() {
    setTicket(null);
    setSelected(null);
    setRound((value) => value + 1); // remounts the search: empty and focused
  }

  // Esc goes back to an empty search. An effect event: it always calls the latest next() without re-subscribing.
  const onEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !document.querySelector('[role=dialog]')) next();
  });

  useEffect(() => {
    if (!selected && !ticket) return;

    window.addEventListener('keydown', onEscape);

    return () => window.removeEventListener('keydown', onEscape);
  }, [selected, ticket]);

  const notes = Object.fromEntries(
    Object.entries(props.registeredToday).map(([id, entry]) => [id, t('registeredNote', { number: entry.queueNo })]),
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <section aria-label={t('search')} className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold">{t('step1')}</h2>
          <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <PatientSearch
              key={round}
              onSelect={(patient) => {
                setTicket(null);
                setSelected(patient);
              }}
              selectedId={selected?.id}
              notes={notes}
            />
          </div>
        </section>
        {props.children}
      </div>

      <aside aria-label={t('registration')} className="flex flex-col gap-2.5 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">{ticket ? t('step3') : t('step2')}</h2>
        {ticket ? (
          <QueueTicket ticket={ticket} onNext={next} />
        ) : selected ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <PatientCard patient={selected} today={props.registeredToday[selected.id]} onClose={next} />
            <div className="p-4">
              <VisitsRegisterForm
                key={selected.id}
                patientId={selected.id}
                hasBpjsNumber={Boolean(selected.bpjs_number)}
                sessions={props.sessions}
                canManageSchedules={props.canManageSchedules}
                now={props.now}
                layout="panel"
                onRegistered={(visit) => setTicket({ ...visit, patient: selected })}
              />
            </div>
          </div>
        ) : (
          props.idle
        )}
      </aside>
    </div>
  );
}

type PatientCardProps = {
  patient: SearchPatient;
  today?: TodayEntry;
  onClose: () => void;
};

function PatientCard(props: PatientCardProps) {
  const { patient } = props;
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-3 border-b bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-sm font-semibold text-white">
          {initials(patient.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{patient.full_name}</p>
          <p className="text-[0.8125rem] text-muted-foreground">
            {t(`sex.${patient.sex as 'male' | 'female'}`)},{' '}
            {t('patients.ageLong', { age: ageInYears(patient.birth_date) })} · {t('patients.mrn')}{' '}
            <span className="tabular font-medium text-foreground">{patient.mrn}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('visits.desk.anotherPatient')}
          title={t('visits.desk.anotherPatient')}
          onClick={props.onClose}>
          <XIcon />
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.8125rem]">
        <Fact
          icon={<IdCardIcon />}
          label="NIK"
          value={patient.nik ? formatIdNumber(patient.nik) : t('visits.desk.notSet')}
        />
        <Fact
          icon={<PhoneIcon />}
          label="HP"
          value={patient.phone ? formatPhone(patient.phone) : t('visits.desk.notSet')}
        />
        <Fact icon={<UserRoundIcon />} label="BPJS" value={patient.bpjs_number ?? t('visits.desk.notMember')} wide />
      </dl>
      {props.today && (
        <p className="flex items-start gap-2 rounded-lg bg-status-waiting-soft px-3 py-2 text-[0.8125rem] text-status-waiting">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {t.rich('visits.desk.alreadyToday', {
              number: props.today.queueNo,
              poli: props.today.poliName,
              status: t(`visitStatus.${props.today.status}`).toLowerCase(),
              b: (chunks) => <span className="font-semibold">{chunks}</span>,
            })}
          </span>
        </p>
      )}
      <Link
        href={`/patients/${patient.id}`}
        className="w-fit text-[0.8125rem] font-medium text-primary hover:underline">
        {t('visits.desk.openPatient')}
      </Link>
    </div>
  );
}

type FactProps = {
  icon: ReactNode;
  label: string;
  value: string;
  wide?: boolean;
};

function Fact(props: FactProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', props.wide && 'col-span-2')}>
      <span className="text-muted-foreground [&_svg]:size-3.5" aria-hidden>
        {props.icon}
      </span>
      <dt className="sr-only">{props.label}</dt>
      <dd className="tabular truncate">{props.value}</dd>
    </div>
  );
}

type QueueTicketProps = {
  ticket: Ticket;
  onNext: () => void;
};

/** What to tell the patient: a big number, where to wait, who they will see. */
function QueueTicket(props: QueueTicketProps) {
  const { ticket } = props;
  const t = useTranslations();

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_8px_30px_-12px_rgb(15_31_27/0.25)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.98] motion-safe:duration-200">
      <div className="flex items-center gap-2 border-b bg-secondary/60 px-4 py-2.5 text-sm font-medium text-secondary-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
        </span>
        {t('visits.desk.inQueue')}
      </div>
      <div className="flex flex-col items-center gap-1 px-4 pt-6 pb-5 text-center">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">{t('visits.desk.queueNumber')}</p>
        <p className="numeral text-[5rem] text-status-waiting">{ticket.queueNo}</p>
        <p className="mt-1 font-semibold">{ticket.patient.full_name}</p>
        <p className="text-sm text-muted-foreground">
          {ticket.session.poliName} · {ticket.session.doctorName}
        </p>
        <p className="tabular text-sm text-muted-foreground">
          {t('visits.desk.practice')} {toHourMinute(ticket.session.startTime)}–{toHourMinute(ticket.session.endTime)} ·{' '}
          {t(`payer.${ticket.payer}`)}
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t bg-muted/30 p-4">
        <Button size="lg" autoFocus className="w-full" onClick={props.onNext}>
          {t('visits.desk.nextPatient')}
          <kbd className="ml-1 rounded bg-white/15 px-1.5 font-sans text-[0.6875rem] font-medium">Enter</kbd>
        </Button>
        <Link
          href={`/patients/${ticket.patient.id}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full')}>
          {t('visits.desk.openRecord')}
        </Link>
      </div>
    </div>
  );
}
