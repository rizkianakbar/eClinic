import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CakeIcon,
  ChevronLeftIcon,
  IdCardIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import { EXAM_VIEWER_ROLES } from "@/features/exam/exam.constants";
import { jakartaClock } from "@/features/home/home.lib";
import {
  PATIENT_EDITOR_ROLES,
  PATIENT_VIEWER_ROLES,
  SEX_LABELS,
} from "@/features/patients/patients.constants";
import { ageInYears, formatIdNumber, formatPhone, initials } from "@/features/patients/patients.lib";
import { getPatient } from "@/features/patients/patients.service";
import { PatientsSheet } from "@/features/patients/patients-sheet";
import {
  listPatientVisits,
  listPatientPrimaryDiagnoses,
  listTodaySessions,
} from "@/features/visits/visits.service";
import {
  PAYER_LABELS,
  VISIT_STATUS_LABELS,
} from "@/features/visits/visits.constants";
import { VisitsHistory } from "@/features/visits/visits-history";
import { VisitsJourneyPosition } from "@/features/visits/visits-journey-line";
import { VisitsRegisterSheet } from "@/features/visits/visits-register-sheet";
import { requireRole } from "@/lib/auth";
import { formatDate, relativeDay, todayInJakarta } from "@/lib/dates";
import { Tag } from "@/components/ui/tag";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Data pasien" };

const has = (roles: readonly string[], role: string) => roles.includes(role);

const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function PatientPage(
  props: PageProps<"/patients/[patientId]">,
) {
  const session = await requireRole(...PATIENT_VIEWER_ROLES);
  const { patientId } = await props.params;
  if (!z.uuid().safeParse(patientId).success) notFound();
  const canEdit = has(PATIENT_EDITOR_ROLES, session.role);
  const clinical = has(EXAM_VIEWER_ROLES, session.role);
  const today = todayInJakarta();

  const supabase = await createClient();
  const [patient, sessions, visits, diagnoses] = await Promise.all([
    getPatient(supabase, patientId),
    canEdit ? listTodaySessions(supabase) : Promise.resolve([]),
    listPatientVisits(supabase, patientId),
    // Front desk and cashier may not read diagnoses (RLS would return none anyway).
    clinical ? listPatientPrimaryDiagnoses(supabase, patientId) : Promise.resolve(new Map<string, { code: string; name: string }>()),
  ]);
  if (!patient) notFound();

  const counted = visits.filter((visit) => visit.status !== "cancelled");
  const todayVisit = counted.find((visit) => visit.visit_date === today);
  const first = counted.at(-1);
  const bpjsVisits = counted.filter(
    (visit) => visit.payer_type === "bpjs",
  ).length;
  const visitHref = (id: string) =>
    clinical ? `/exam/${id}` : `/visits/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Link
          href="/patients"
          className="-ml-1 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          Pasien
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-xl font-semibold text-white shadow-[0_8px_24px_-10px_rgb(15_61_51/0.55)]">
              {initials(patient.full_name)}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="truncate text-[1.5rem] leading-tight font-semibold tracking-tight">
                {patient.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Tag>
                  {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]},{" "}
                  {ageInYears(patient.birth_date)} tahun
                </Tag>
                <Tag>
                  RM{" "}
                  <span className="tabular font-semibold">{patient.mrn}</span>
                </Tag>
                {patient.bpjs_number ? (
                  <Tag className="border-transparent bg-bpjs-soft text-bpjs">
                    Peserta BPJS
                  </Tag>
                ) : (
                  <Tag>Umum</Tag>
                )}
                {!patient.is_active && (
                  <Tag className="border-transparent bg-status-cancelled-soft text-status-cancelled">
                    Nonaktif
                  </Tag>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <PatientsSheet
                mode="edit"
                patientId={patient.id}
                mrn={patient.mrn}
                defaultValues={{
                  full_name: patient.full_name,
                  nik: patient.nik ?? "",
                  bpjs_number: patient.bpjs_number ?? "",
                  birth_date: patient.birth_date,
                  sex: patient.sex as keyof typeof SEX_LABELS,
                  phone: patient.phone ?? "",
                  address: patient.address ?? "",
                }}
              />
              {patient.is_active && (
                <VisitsRegisterSheet
                  patientId={patient.id}
                  patientName={patient.full_name}
                  hasBpjsNumber={Boolean(patient.bpjs_number)}
                  sessions={sessions}
                  canManageSchedules={
                    session.role === "owner" || session.role === "admin"
                  }
                  now={jakartaClock(new Date())}
                />
              )}
            </div>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        {/* One profile card: the numbers first, then who the patient is. */}
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">Profil</h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <dl className="grid grid-cols-2 gap-px border-b bg-border">
              <Stat
                label="Total kunjungan"
                value={String(counted.length)}
                hint="kali"
              />
              <Stat
                label="Terakhir"
                value={
                  counted[0]
                    ? relativeDay(counted[0].visit_date, today)
                    : "Belum pernah"
                }
                hint={
                  counted[0]
                    ? shortDate.format(new Date(counted[0].visit_date))
                    : undefined
                }
              />
              <Stat
                label="Pasien sejak"
                value={
                  first ? shortDate.format(new Date(first.visit_date)) : "–"
                }
              />
              <Stat
                label="Pakai BPJS"
                value={String(bpjsVisits)}
                hint={`dari ${counted.length}`}
              />
            </dl>
            <dl className="flex flex-col divide-y">
              <Fact
                icon={<IdCardIcon />}
                label="NIK"
                value={patient.nik && formatIdNumber(patient.nik)}
                empty="Belum ada"
                mono
              />
              <Fact
                icon={<ShieldCheckIcon />}
                label="Nomor BPJS"
                value={patient.bpjs_number && formatIdNumber(patient.bpjs_number)}
                empty="Bukan peserta"
                mono
              />
              <Fact
                icon={<CakeIcon />}
                label="Tanggal lahir"
                value={`${formatDate(patient.birth_date)} (${ageInYears(patient.birth_date)} th)`}
              />
              <Fact
                icon={<PhoneIcon />}
                label="Nomor HP"
                value={patient.phone && formatPhone(patient.phone)}
                empty="Belum ada"
                mono
              />
              <Fact
                icon={<MapPinIcon />}
                label="Alamat"
                value={patient.address}
                empty="Belum ada"
              />
            </dl>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {todayVisit && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-sm font-semibold">Hari ini</h2>
              <Link
                href={visitHref(todayVisit.id)}
                className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-[linear-gradient(135deg,#f3faf7,#ffffff_60%)] p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-4">
                  <span className="numeral flex size-12 shrink-0 items-center justify-center rounded-xl bg-status-waiting-soft text-[1.375rem] text-status-waiting">
                    {todayVisit.queue_no}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">
                      Nomor antrean · {VISIT_STATUS_LABELS[todayVisit.status]}
                    </p>
                    <p className="truncate font-medium">
                      {todayVisit.poli?.name} · {todayVisit.doctor?.full_name}
                    </p>
                    <p className="text-[0.8125rem] text-muted-foreground">
                      {
                        PAYER_LABELS[
                          todayVisit.payer_type as keyof typeof PAYER_LABELS
                        ]
                      }
                    </p>
                  </div>
                </div>
                <VisitsJourneyPosition
                  status={todayVisit.status}
                  className="border-t border-primary/10 pt-4"
                />
              </Link>
            </section>
          )}

          <section className="flex min-w-0 flex-col gap-2.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Riwayat kunjungan
              <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
                {visits.length}
              </span>
            </h2>
            <VisitsHistory
              visits={visits}
              diagnoses={diagnoses}
              hrefFor={visitHref}
            />
            {!clinical && visits.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Diagnosis dan catatan medis hanya terlihat oleh dokter, perawat,
                dan pemilik.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

type FactProps = {
  icon: ReactNode;
  label: string;
  value: string | null;
  empty?: string;
  mono?: boolean;
};

function Fact(props: FactProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden>
        {props.icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{props.label}</dt>
        <dd
          className={cn(
            "text-sm font-medium break-words",
            props.mono && "tabular",
            !props.value && "font-normal text-muted-foreground",
          )}
        >
          {props.value ?? props.empty}
        </dd>
      </div>
    </div>
  );
}

type StatProps = {
  label: string;
  value: string;
  hint?: string;
};

function Stat(props: StatProps) {
  return (
    <div className="flex flex-col gap-1 bg-card px-4 py-3.5">
      <dt className="text-xs font-medium text-muted-foreground">
        {props.label}
      </dt>
      <dd className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="numeral text-lg">{props.value}</span>
        {props.hint && (
          <span className="text-xs text-muted-foreground">{props.hint}</span>
        )}
      </dd>
    </div>
  );
}
