"use client";

import {
  CheckIcon,
  CircleAlertIcon,
  IdCardIcon,
  PhoneIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SEX_LABELS } from "@/features/patients/patients.constants";
import type { SearchPatient } from "@/features/patients/patients.hooks";
import { ageInYears, formatIdNumber, formatPhone, initials } from "@/features/patients/patients.lib";
import { PatientSearch } from "@/features/patients/patients-search";
import { toHourMinute } from "@/features/schedules/schedules.lib";
import { cn } from "@/lib/utils";
import { PAYER_LABELS, VISIT_STATUS_LABELS } from "./visits.constants";
import type { PracticeSession } from "./visits.lib";
import {
  VisitsRegisterForm,
  type RegisteredVisit,
} from "./visits-register-form";

type TodayEntry = {
  queueNo: number;
  poliName: string;
  status: keyof typeof VISIT_STATUS_LABELS;
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
  const [selected, setSelected] = useState<SearchPatient | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [round, setRound] = useState(0);

  function next() {
    setTicket(null);
    setSelected(null);
    setRound((value) => value + 1); // remounts the search: empty and focused
  }

  useEffect(() => {
    if (!selected && !ticket) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("[role=dialog]"))
        next();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, ticket]);

  const notes = Object.fromEntries(
    Object.entries(props.registeredToday).map(([id, entry]) => [
      id,
      `Terdaftar · No. ${entry.queueNo}`,
    ]),
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <section aria-label="Cari pasien" className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold">1. Cari pasien</h2>
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

      <aside
        aria-label="Pendaftaran"
        className="flex flex-col gap-2.5 lg:sticky lg:top-20"
      >
        <h2 className="text-sm font-semibold">
          {ticket ? "3. Nomor antrean" : "2. Pilih dokter dan daftarkan"}
        </h2>
        {ticket ? (
          <QueueTicket ticket={ticket} onNext={next} />
        ) : selected ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <PatientCard
              patient={selected}
              today={props.registeredToday[selected.id]}
              onClose={next}
            />
            <div className="p-4">
              <VisitsRegisterForm
                key={selected.id}
                patientId={selected.id}
                hasBpjsNumber={Boolean(selected.bpjs_number)}
                sessions={props.sessions}
                canManageSchedules={props.canManageSchedules}
                now={props.now}
                layout="panel"
                onRegistered={(visit) =>
                  setTicket({ ...visit, patient: selected })
                }
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
  return (
    <div className="flex flex-col gap-3 border-b bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-sm font-semibold text-white">
          {initials(patient.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{patient.full_name}</p>
          <p className="text-[0.8125rem] text-muted-foreground">
            {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]},{" "}
            {ageInYears(patient.birth_date)} tahun · RM{" "}
            <span className="tabular font-medium text-foreground">
              {patient.mrn}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Pilih pasien lain (Esc)"
          title="Pilih pasien lain (Esc)"
          onClick={props.onClose}
        >
          <XIcon />
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.8125rem]">
        <Fact
          icon={<IdCardIcon />}
          label="NIK"
          value={patient.nik ? formatIdNumber(patient.nik) : "Belum ada"}
        />
        <Fact
          icon={<PhoneIcon />}
          label="HP"
          value={patient.phone ? formatPhone(patient.phone) : "Belum ada"}
        />
        <Fact
          icon={<UserRoundIcon />}
          label="BPJS"
          value={patient.bpjs_number ?? "Bukan peserta"}
          wide
        />
      </dl>
      {props.today && (
        <p className="flex items-start gap-2 rounded-lg bg-status-waiting-soft px-3 py-2 text-[0.8125rem] text-status-waiting">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Sudah terdaftar hari ini: nomor{" "}
            <span className="font-semibold">{props.today.queueNo}</span>,{" "}
            {props.today.poliName} (
            {VISIT_STATUS_LABELS[props.today.status].toLowerCase()}). Daftarkan
            lagi hanya jika ke poli lain.
          </span>
        </p>
      )}
      <Link
        href={`/patients/${patient.id}`}
        className="w-fit text-[0.8125rem] font-medium text-primary hover:underline"
      >
        Buka data dan riwayat pasien
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
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        props.wide && "col-span-2",
      )}
    >
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
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_8px_30px_-12px_rgb(15_31_27/0.25)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.98] motion-safe:duration-200">
      <div className="flex items-center gap-2 border-b bg-secondary/60 px-4 py-2.5 text-sm font-medium text-secondary-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
        </span>
        Terdaftar di antrean
      </div>
      <div className="flex flex-col items-center gap-1 px-4 pt-6 pb-5 text-center">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">
          Nomor antrean
        </p>
        <p className="numeral text-[5rem] text-status-waiting">
          {ticket.queueNo}
        </p>
        <p className="mt-1 font-semibold">{ticket.patient.full_name}</p>
        <p className="text-sm text-muted-foreground">
          {ticket.session.poliName} · {ticket.session.doctorName}
        </p>
        <p className="tabular text-sm text-muted-foreground">
          Praktik {toHourMinute(ticket.session.startTime)}–
          {toHourMinute(ticket.session.endTime)} · {PAYER_LABELS[ticket.payer]}
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t bg-muted/30 p-4">
        <Button size="lg" autoFocus className="w-full" onClick={props.onNext}>
          Pasien berikutnya
          <kbd className="ml-1 rounded bg-white/15 px-1.5 font-sans text-[0.6875rem] font-medium">
            Enter
          </kbd>
        </Button>
        <Link
          href={`/patients/${ticket.patient.id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full",
          )}
        >
          Buka data pasien
        </Link>
      </div>
    </div>
  );
}
