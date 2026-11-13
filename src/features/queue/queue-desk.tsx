'use client';

import { ChevronRightIcon, CoffeeIcon, MegaphoneIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Elapsed } from '@/components/ui/elapsed';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import { SEX_LABELS } from '@/features/patients/patients.constants';
import { ageInYears } from '@/features/patients/patients.lib';
import { toHourMinute } from '@/features/schedules/schedules.lib';
import type { PracticeSession } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { cn } from '@/lib/utils';
import { callVisitAction, skipVisitAction, startExamAction } from './queue.actions';
import { type DeskDetails, useDeskDetails, useQueueAction, useQueueBoard } from './queue.hooks';
import { type Actor, buildLanes, canCall, canSkip, canStartExam, type QueueVisit } from './queue.lib';
import { DoctorRoom } from './queue-board';
import { QueueVitalChips } from './queue-vital-chips';

type QueueDeskProps = {
  actor: Actor;
  visitDate: string;
  /** My practice sessions today (with quota use), from the server. */
  sessions: PracticeSession[];
  /** Server render time for the wait timers' first paint. */
  now: number;
};

const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));

/** The doctor's home: the room, how my day is going, who waits for me (with triage), and who I have seen. */
export function QueueDesk(props: QueueDeskProps) {
  const board = useQueueBoard(props.visitDate);
  const all = board.data ?? [];
  const mine = all.filter((visit) => visit.doctor_id === props.actor.userId);
  const lanes = buildLanes(mine);
  const waiting = [...lanes.called, ...lanes.waiting];
  const finished = [...lanes.inExam, ...lanes.toPharmacy, ...lanes.toCashier, ...lanes.done];

  const details = useDeskDetails(
    props.visitDate,
    mine.filter((visit) => visit.status !== 'cancelled').map((visit) => visit.id),
  );

  const vitals = details.data?.vitals ?? new Map();

  const quota = props.sessions.reduce((sum, session) => sum + session.quota, 0);
  const taken = props.sessions.reduce((sum, session) => sum + session.taken, 0);

  const longest = waiting.reduce(
    (max, visit) => Math.max(max, minutesSince(visit.created_at ?? visit.updated_at, props.now)),
    0,
  );

  const seen = lanes.toPharmacy.length + lanes.toCashier.length + lanes.done.length;

  const bpjsSeen = [...lanes.toPharmacy, ...lanes.toCashier, ...lanes.done].filter(
    (visit) => visit.payer_type === 'bpjs',
  ).length;

  const triaged = waiting.filter((visit) => vitals.has(visit.id)).length;

  return (
    <div className="flex flex-col gap-6">
      <DoctorRoom visits={all} actor={props.actor} visitDate={props.visitDate} vitals={vitals} />

      <dl className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] lg:grid-cols-4 lg:divide-y-0">
        <DayFigure label="Jadwal hari ini">
          {props.sessions.length === 0 ? (
            <dd className="text-sm text-muted-foreground">Tidak ada jadwal praktik</dd>
          ) : (
            props.sessions.map((session) => (
              <dd key={session.id} className="flex items-baseline gap-1.5">
                <span className="numeral text-[1.125rem]">
                  {toHourMinute(session.startTime)}–{toHourMinute(session.endTime)}
                </span>
                <span className="truncate text-xs text-muted-foreground">{session.poliName}</span>
              </dd>
            ))
          )}
        </DayFigure>
        <DayFigure label="Kuota terisi">
          <dd className="numeral text-[1.5rem]">
            {taken}
            <span className="text-base text-muted-foreground">/{quota}</span>
          </dd>
          <dd className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                'block h-full rounded-full',
                taken >= quota && quota > 0 ? 'bg-status-cancelled' : 'bg-primary',
              )}
              style={{ width: `${quota ? Math.min(100, Math.round((taken / quota) * 100)) : 0}%` }}
            />
          </dd>
        </DayFigure>
        <DayFigure label="Menunggu saya">
          <dd className="numeral text-[1.5rem]">{waiting.length}</dd>
          <dd className="text-xs text-muted-foreground">
            {waiting.length === 0
              ? 'Ruang tunggu kosong'
              : `${triaged} sudah tanda vital · terlama ${longest < 60 ? `${longest} mnt` : `${Math.floor(longest / 60)} j ${longest % 60} m`}`}
          </dd>
        </DayFigure>
        <DayFigure label="Selesai diperiksa">
          <dd className="numeral text-[1.5rem]">{seen}</dd>
          <dd className="text-xs text-muted-foreground">
            {seen === 0 ? 'Belum ada' : `${bpjsSeen} BPJS · ${seen - bpjsSeen} umum`}
          </dd>
        </DayFigure>
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel
          title="Antrean saya"
          count={waiting.length}
          dot="bg-line-waiting"
          link={{ href: '/queue', label: 'Papan antrean' }}>
          {board.isPending ? (
            <div className="h-40 animate-pulse bg-muted/60" />
          ) : waiting.length + lanes.skipped.length === 0 ? (
            <PanelEmpty
              icon={<CoffeeIcon />}
              title="Tidak ada pasien menunggu"
              description="Pasien yang didaftarkan ke jadwal Anda muncul di sini."
            />
          ) : (
            <ol className="divide-y">
              {waiting.map((visit) => (
                <WaitingRow
                  key={visit.id}
                  visit={visit}
                  actor={props.actor}
                  visitDate={props.visitDate}
                  details={details.data}
                  now={props.now}
                />
              ))}
              {lanes.skipped.length > 0 && (
                <>
                  <li className="bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                    Dilewati, bisa dipanggil ulang
                  </li>
                  {lanes.skipped.map((visit) => (
                    <WaitingRow
                      key={visit.id}
                      visit={visit}
                      actor={props.actor}
                      visitDate={props.visitDate}
                      details={details.data}
                      now={props.now}
                    />
                  ))}
                </>
              )}
            </ol>
          )}
        </Panel>

        <Panel title="Pasien saya hari ini" count={finished.length}>
          {finished.length === 0 ? (
            <PanelEmpty title="Belum ada pasien diperiksa" description="Diagnosis utama tiap pasien tampil di sini." />
          ) : (
            <ul className="divide-y">
              {finished.map((visit) => {
                const station = STATION_COLORS[visit.status as keyof typeof STATION_COLORS] ?? STATION_COLORS.done;
                const diagnosis = details.data?.diagnoses.get(visit.id);

                return (
                  <li key={visit.id}>
                    <Link
                      href={`/exam/${visit.id}`}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                      <span
                        className={cn(
                          'numeral flex size-8 shrink-0 items-center justify-center rounded-lg text-sm',
                          station.soft,
                          station.text,
                        )}>
                        {visit.queue_no}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{visit.patient?.full_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {diagnosis ? (
                            <>
                              <span className="tabular font-semibold text-foreground/70">{diagnosis.code}</span>{' '}
                              {diagnosis.name}
                            </>
                          ) : visit.status === 'in_exam' ? (
                            'Sedang diperiksa'
                          ) : (
                            'Tanpa diagnosis'
                          )}
                        </span>
                      </span>
                      <span className={cn('shrink-0 text-xs font-medium', station.text)}>
                        {STATUS_SHORT[visit.status] ?? ''}
                      </span>
                      <ChevronRightIcon
                        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

const STATUS_SHORT: Record<string, string> = {
  in_exam: 'Periksa',
  to_pharmacy: 'Farmasi',
  to_cashier: 'Kasir',
  done: 'Pulang',
};

function DayFigure(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-5 py-4">
      <dt className="mb-0.5 text-xs font-medium text-muted-foreground">{props.label}</dt>
      {props.children}
    </div>
  );
}

type WaitingRowProps = {
  visit: QueueVisit;
  actor: Actor;
  visitDate: string;
  details: DeskDetails | undefined;
  now: number;
};

/** One waiting patient: number, who, triage vitals, how long they have waited, and my next action. */
function WaitingRow(props: WaitingRowProps) {
  const { visit, actor, visitDate } = props;
  const router = useRouter();
  const call = useQueueAction(visitDate, callVisitAction);
  const skip = useQueueAction(visitDate, skipVisitAction);
  const start = useQueueAction(visitDate, startExamAction);
  const pending = call.isPending || skip.isPending || start.isPending;
  const called = Boolean(visit.called_at) && !visit.skipped_at;
  const color = STATION_COLORS.waiting;
  const patient = visit.patient;

  return (
    <li className={cn('flex items-start gap-3 px-4 py-3', called && 'bg-status-waiting-soft/40')}>
      <span
        className={cn(
          'numeral flex size-10 shrink-0 items-center justify-center rounded-lg text-lg',
          called ? cn(color.line, 'text-white') : cn(color.soft, color.text),
          visit.skipped_at && 'opacity-60',
        )}>
        {visit.queue_no}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="min-w-0 truncate text-sm font-semibold">{patient?.full_name ?? '-'}</p>
          {visit.payer_type === 'bpjs' && (
            <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
              BPJS
            </span>
          )}
          <span className="text-[0.8125rem] text-muted-foreground">
            {patient && `${SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]}, ${ageInYears(patient.birth_date)} th`}
          </span>
        </div>
        <QueueVitalChips reading={props.details?.vitals.get(visit.id)} essentialOnly />
        {called && (
          <p className={cn('flex items-center gap-1.5 text-xs font-medium', color.text)}>
            <MegaphoneIcon className="size-3.5" aria-hidden />
            Sudah dipanggil, menunggu masuk
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Elapsed since={visit.created_at ?? visit.updated_at} now={props.now} />
        <div className="flex gap-1.5">
          {canStartExam(actor, visit) && called && (
            <Button
              size="xs"
              disabled={pending}
              onClick={() => start.mutate(visit.id, { onSuccess: () => router.push(`/exam/${visit.id}`) })}>
              Mulai periksa
            </Button>
          )}
          {canCall(actor, visit) && (
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() =>
                call.mutate(visit.id, { onSuccess: () => toast.success(`Nomor ${visit.queue_no} dipanggil.`) })
              }>
              <MegaphoneIcon />
              {visit.called_at || visit.skipped_at ? 'Ulang' : 'Panggil'}
            </Button>
          )}
          {canSkip(actor, visit) && called && (
            <Button size="xs" variant="ghost" disabled={pending} onClick={() => skip.mutate(visit.id)}>
              Lewati
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
