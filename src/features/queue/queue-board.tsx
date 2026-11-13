'use client';

import { ArrowRightIcon, MegaphoneIcon, StethoscopeIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Arrival, ArrivalScope } from '@/components/ui/arrival';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { VitalsReading } from '@/features/exam/exam.lib';
import { ExamVitalsDialog } from '@/features/exam/exam-vitals-dialog';
import { SEX_LABELS } from '@/features/patients/patients.constants';
import { ageInYears } from '@/features/patients/patients.lib';
import type { JourneyStatus } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { formatTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { callVisitAction, skipVisitAction, startExamAction } from './queue.actions';
import { useQueueAction, useQueueBoard } from './queue.hooks';
import {
  type Actor,
  buildLanes,
  canCall,
  canCancel,
  canOpenExam,
  canRecordVitals,
  canSkip,
  canStartExam,
  doctorRoom,
  hasVitals,
  polisOf,
  type QueueVisit,
} from './queue.lib';
import { QueueCancelDialog } from './queue-cancel-dialog';
import { QueueBoardSkeleton } from './queue-skeleton';
import { QueueTicket } from './queue-ticket';
import { QueueVitalChips } from './queue-vital-chips';

type QueueBoardProps = {
  actor: Actor;
  visitDate: string;
};

type Scope = 'mine' | 'all';

/** Today's queue as the walk through the clinic: waiting room, then each station. */
export function QueueBoard(props: QueueBoardProps) {
  const { actor, visitDate } = props;
  const isDoctor = actor.role === 'doctor';
  const [scope, setScope] = useState<Scope>(isDoctor ? 'mine' : 'all');
  const [poliId, setPoliId] = useState('all');
  const board = useQueueBoard(visitDate);

  if (board.isPending) return <QueueBoardSkeleton doctor={isDoctor} />;

  if (board.isError) {
    return <EmptyState title="Antrean gagal dimuat" description={board.error.message} />;
  }

  const all = board.data;
  const inScope = all.filter((visit) => scope === 'all' || visit.doctor_id === actor.userId);
  const polis = polisOf(inScope);
  const visits = inScope.filter((visit) => poliId === 'all' || polis.length < 2 || visit.poli_id === poliId);
  const lanes = buildLanes(visits);
  const showPoli = polis.length > 1 && poliId === 'all';
  const ticketProps = { actor, visitDate, showPoli };

  return (
    <div className="flex flex-col gap-6">
      {isDoctor && <DoctorRoom visits={all} actor={actor} visitDate={visitDate} />}

      <div className="flex flex-wrap items-center gap-2">
        <p className="order-last ml-auto flex gap-4 text-sm text-muted-foreground">
          <span>
            Pulang <span className="tabular font-semibold text-foreground">{lanes.done.length}</span>
          </span>
          <span>
            Batal <span className="tabular font-semibold text-foreground">{lanes.cancelled.length}</span>
          </span>
        </p>
        {isDoctor && (
          <SegmentedControl
            label="Tampilkan"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'mine', label: 'Pasien saya' },
              { value: 'all', label: 'Semua dokter' },
            ]}
          />
        )}
        {polis.length > 1 && (
          <SegmentedControl
            label="Poli"
            value={poliId}
            onChange={setPoliId}
            options={[
              { value: 'all', label: 'Semua poli' },
              ...polis.map((poli) => ({ value: poli.id, label: poli.name })),
            ]}
          />
        )}
      </div>

      {/* Keyed by the filters: switching them re-renders the lanes without counting everyone as arriving. */}
      <ArrivalScope key={`${scope}:${poliId}`}>
        {visits.length === 0 ? (
          <EmptyState
            icon={StethoscopeIcon}
            title={scope === 'mine' ? 'Belum ada pasien untuk Anda hari ini' : 'Belum ada pasien hari ini'}
            description="Pasien muncul di sini begitu didaftarkan di Pendaftaran."
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <Lane station="waiting" title="Ruang tunggu" count={lanes.called.length + lanes.waiting.length}>
              {lanes.called.length + lanes.waiting.length + lanes.skipped.length === 0 && (
                <LaneEmpty>Ruang tunggu kosong</LaneEmpty>
              )}
              {[...lanes.called, ...lanes.waiting].map((visit) => (
                <Arrival key={visit.id}>
                  <WaitingTicket visit={visit} {...ticketProps} />
                </Arrival>
              ))}
              {lanes.skipped.length > 0 && (
                <>
                  <p className="px-1 pt-2 text-xs font-medium text-muted-foreground">Dilewati, bisa dipanggil ulang</p>
                  {lanes.skipped.map((visit) => (
                    <WaitingTicket key={visit.id} visit={visit} {...ticketProps} />
                  ))}
                </>
              )}
            </Lane>
            <StationLane station="in_exam" title="Ruang periksa" visits={lanes.inExam} {...ticketProps} />
            <StationLane station="to_pharmacy" title="Farmasi" visits={lanes.toPharmacy} {...ticketProps} />
            <StationLane station="to_cashier" title="Kasir" visits={lanes.toCashier} {...ticketProps} />
          </div>
        )}
      </ArrivalScope>
    </div>
  );
}

type DoctorRoomProps = {
  visits: QueueVisit[];
  actor: Actor;
  visitDate: string;
  /** Latest vitals per visit, shown under the patient in the room (the doctor's desk passes them). */
  vitals?: Map<string, VitalsReading>;
};

/** The doctor's one next move, big: continue, start, or call the next number. */
export function DoctorRoom(props: DoctorRoomProps) {
  const router = useRouter();
  const room = doctorRoom(props.visits, props.actor.userId);
  const call = useQueueAction(props.visitDate, callVisitAction);
  const skip = useQueueAction(props.visitDate, skipVisitAction);
  const start = useQueueAction(props.visitDate, startExamAction);
  const pending = call.isPending || skip.isPending || start.isPending;

  const callNumber = (visit: QueueVisit) =>
    call.mutate(visit.id, { onSuccess: () => toast.success(`Nomor ${visit.queue_no} dipanggil.`) });

  let label: string;
  let visit: QueueVisit | undefined;
  let station: JourneyStatus = 'waiting';
  let actions: ReactNode = null;

  if (room.examining) {
    label = 'Sedang Anda periksa';
    visit = room.examining;
    station = 'in_exam';

    actions = (
      <Link href={`/exam/${visit.id}`} className={buttonVariants({ size: 'lg' })}>
        Lanjutkan pemeriksaan
        <ArrowRightIcon />
      </Link>
    );
  } else if (room.called) {
    label = 'Sudah dipanggil, menunggu masuk';
    visit = room.called;

    const called = visit;

    actions = (
      <>
        {hasVitals(called) ? (
          <Button
            size="lg"
            disabled={pending}
            onClick={() => start.mutate(called.id, { onSuccess: () => router.push(`/exam/${called.id}`) })}>
            <StethoscopeIcon />
            Pasien masuk, mulai periksa
          </Button>
        ) : (
          <ExamVitalsDialog
            visitId={called.id}
            patientName={called.patient?.full_name ?? ''}
            size="lg"
            label="Catat tanda vital dulu"
          />
        )}
        <Button size="lg" variant="outline" disabled={pending} onClick={() => callNumber(called)}>
          <MegaphoneIcon />
          Panggil ulang
        </Button>
        <Button size="lg" variant="ghost" disabled={pending} onClick={() => skip.mutate(called.id)}>
          Lewati
        </Button>
      </>
    );
  } else if (room.next) {
    label = 'Berikutnya';
    visit = room.next;

    const next = visit;

    actions = (
      <Button size="lg" disabled={pending} onClick={() => callNumber(next)}>
        <MegaphoneIcon />
        Panggil nomor {next.queue_no}
      </Button>
    );
  } else if (room.awaitingVitals[0]) {
    label = 'Menunggu tanda vital';
    visit = room.awaitingVitals[0];

    const first = visit;

    actions = (
      <ExamVitalsDialog
        visitId={first.id}
        patientName={first.patient?.full_name ?? ''}
        size="lg"
        label="Catat tanda vital"
      />
    );
  } else {
    label = 'Ruang periksa Anda';
  }

  const color = STATION_COLORS[station];

  return (
    <section
      aria-label="Ruang periksa Anda"
      className="relative overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,#f6fbf9,#ffffff_55%)] p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-4 sm:gap-5">
          {visit ? (
            <span
              className={cn(
                'numeral flex size-16 shrink-0 items-center justify-center rounded-2xl text-[2rem] sm:size-24 sm:text-[2.75rem]',
                color.soft,
                color.text,
              )}>
              {visit.queue_no}
            </span>
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground sm:size-24">
              <StethoscopeIcon className="size-8" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {visit ? (
              <>
                <p className="truncate text-[1.375rem] leading-tight font-semibold tracking-tight">
                  {visit.patient?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {visit.patient &&
                    `${SEX_LABELS[visit.patient.sex as keyof typeof SEX_LABELS]}, ${ageInYears(visit.patient.birth_date)} tahun · `}
                  {visit.poli?.name} · {visit.payer_type === 'bpjs' ? 'BPJS' : 'Umum'}
                  {station === 'in_exam' && ` · diperiksa sejak ${formatTime(visit.updated_at)}`}
                </p>
                {props.vitals && <QueueVitalChips reading={props.vitals.get(visit.id)} className="mt-2" />}
              </>
            ) : (
              <p className="text-[1.125rem] font-semibold">Belum ada pasien menunggu</p>
            )}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto *:max-sm:flex-1">{actions}</div>}
      </div>
      {room.waitingCount > 0 && (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
          <span>
            <span className="tabular font-semibold text-foreground">{room.waitingCount}</span> pasien Anda di ruang
            tunggu
          </span>
          {room.awaitingVitals.length > 0 && (
            <span className="font-medium text-status-waiting">
              {room.awaitingVitals.length} belum diperiksa tanda vital, belum bisa dipanggil
            </span>
          )}
        </p>
      )}
    </section>
  );
}

type LaneProps = {
  station: JourneyStatus;
  title: string;
  count: number;
  children: ReactNode;
};

function Lane(props: LaneProps) {
  const color = STATION_COLORS[props.station];

  return (
    <section aria-label={props.title} className="flex min-w-0 flex-col rounded-xl border bg-muted/40">
      <h2 className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold">
        <span className={cn('size-2 rounded-full', color.line)} aria-hidden />
        {props.title}
        <span className="tabular ml-auto rounded-full bg-card px-2 text-xs leading-5 font-semibold shadow-[0_0_0_1px_var(--border)]">
          {props.count}
        </span>
      </h2>
      {/* Each column scrolls on its own, so a long list never pushes the others off screen. */}
      <div className="flex max-h-[calc(100dvh-15rem)] min-h-24 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
        {props.children}
      </div>
    </section>
  );
}

type LaneEmptyProps = {
  children: ReactNode;
};

/** A quiet placeholder that keeps the lane's shape, so an empty station still reads as a place. */
function LaneEmpty(props: LaneEmptyProps) {
  return (
    <p className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-black/10 px-4 py-5 text-center text-[0.8125rem] text-muted-foreground">
      {props.children}
    </p>
  );
}

const EMPTY_LANE: Partial<Record<JourneyStatus, string>> = {
  in_exam: 'Belum ada yang diperiksa',
  to_pharmacy: 'Tidak ada resep diproses',
  to_cashier: 'Tidak ada yang menunggu bayar',
};

type TicketContext = {
  actor: Actor;
  visitDate: string;
  showPoli: boolean;
};

type StationLaneProps = TicketContext & {
  station: JourneyStatus;
  title: string;
  visits: QueueVisit[];
};

function StationLane(props: StationLaneProps) {
  return (
    <Lane station={props.station} title={props.title} count={props.visits.length}>
      {props.visits.length === 0 ? (
        <LaneEmpty>{EMPTY_LANE[props.station] ?? 'Kosong'}</LaneEmpty>
      ) : (
        props.visits.map((visit) => (
          <Arrival key={visit.id}>
            <QueueTicket
              visit={visit}
              station={props.station}
              size="compact"
              showPoli={props.showPoli}
              href={props.station === 'in_exam' && canOpenExam(props.actor) ? `/exam/${visit.id}` : undefined}
            />
          </Arrival>
        ))
      )}
    </Lane>
  );
}

type WaitingTicketProps = TicketContext & {
  visit: QueueVisit;
};

export function WaitingTicket(props: WaitingTicketProps) {
  const { visit, actor, visitDate } = props;
  const router = useRouter();
  const call = useQueueAction(visitDate, callVisitAction);
  const skip = useQueueAction(visitDate, skipVisitAction);
  const start = useQueueAction(visitDate, startExamAction);
  const pending = call.isPending || skip.isPending || start.isPending;
  const called = Boolean(visit.called_at) && !visit.skipped_at;

  const actions = (
    <>
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
          {visit.called_at || visit.skipped_at ? 'Panggil ulang' : 'Panggil'}
        </Button>
      )}
      {canSkip(actor, visit) && called && (
        <Button size="xs" variant="ghost" disabled={pending} onClick={() => skip.mutate(visit.id)}>
          Lewati
        </Button>
      )}
      {canRecordVitals(actor, visit) && (
        <ExamVitalsDialog
          visitId={visit.id}
          patientName={visit.patient?.full_name ?? ''}
          label={hasVitals(visit) ? 'Vital' : 'Catat vital'}
          primary={!hasVitals(visit)}
        />
      )}
      {canCancel(actor, visit) && <QueueCancelDialog visit={visit} visitDate={visitDate} />}
    </>
  );

  return <QueueTicket visit={visit} station="waiting" showPoli={props.showPoli} actions={actions} />;
}
