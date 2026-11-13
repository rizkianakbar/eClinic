import type { ReactNode } from 'react';
import { Panel } from '@/components/ui/panel';
import { SegmentedSkeleton } from '@/components/ui/segmented-skeleton';
import { placeholders, Skeleton, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { cn } from '@/lib/utils';

/*
 * Loading states for the queue screens, drawn with the real frames (lanes, tickets, the doctor's room) so the
 * board does not shift when the live data arrives. Server-safe: used by loading.tsx and by the client
 * components while their first query is pending.
 */

type TicketSkeletonProps = {
  compact?: boolean;
  /** Waiting tickets carry their action buttons. */
  actions?: boolean;
};

/** QueueTicket's frame: number tile, name, meta, and the action row. */
export function QueueTicketSkeleton(props: TicketSkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]',
        props.compact ? 'p-2.5' : 'p-3',
      )}>
      <Skeleton className={cn('shrink-0 rounded-lg', props.compact ? 'size-9' : 'size-12')} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SkeletonLine className="w-32" />
        {!props.compact && <SkeletonLine className="w-44" />}
        {props.actions && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SkeletonButton size="xs" className="w-20" />
            <SkeletonButton size="xs" className="w-16" />
          </div>
        )}
      </div>
    </div>
  );
}

type LaneSkeletonProps = {
  station: keyof typeof STATION_COLORS;
  title: string;
  children: ReactNode;
};

function LaneSkeleton(props: LaneSkeletonProps) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-muted/40">
      <h2 className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold">
        <span className={cn('size-2 rounded-full', STATION_COLORS[props.station].line)} aria-hidden />
        {props.title}
        <Skeleton className="ml-auto h-5 w-7 rounded-full" />
      </h2>
      <div className="flex min-h-24 flex-col gap-2 p-2">{props.children}</div>
    </section>
  );
}

type QueueBoardSkeletonProps = {
  /** Doctors see their room on top and the "Pasien saya / Semua dokter" switch. */
  doctor?: boolean;
};

/** The queue board: (the doctor's room,) the filter row, and the four station lanes. */
export function QueueBoardSkeleton(props: QueueBoardSkeletonProps) {
  return (
    <div className="flex flex-col gap-6">
      {props.doctor && <DoctorRoomSkeleton />}
      <div className="flex flex-wrap items-center gap-2">
        <p className="order-last ml-auto flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            Pulang <Skeleton className="h-3 w-3 rounded" />
          </span>
          <span className="flex items-center gap-1">
            Batal <Skeleton className="h-3 w-3 rounded" />
          </span>
        </p>
        {props.doctor && <SegmentedSkeleton options={['Pasien saya', 'Semua dokter']} />}
      </div>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <LaneSkeleton station="waiting" title="Ruang tunggu">
          {placeholders(3).map((key) => (
            <QueueTicketSkeleton key={key} actions />
          ))}
        </LaneSkeleton>
        <LaneSkeleton station="in_exam" title="Ruang periksa">
          <QueueTicketSkeleton compact />
        </LaneSkeleton>
        <LaneSkeleton station="to_pharmacy" title="Farmasi">
          <QueueTicketSkeleton compact />
        </LaneSkeleton>
        <LaneSkeleton station="to_cashier" title="Kasir">
          <QueueTicketSkeleton compact />
        </LaneSkeleton>
      </div>
    </div>
  );
}

/** DoctorRoom's frame: the big number, who it is, and the one action. */
export function DoctorRoomSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,#f6fbf9,#ffffff_55%)] p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-4 sm:gap-5">
          <Skeleton className="size-16 shrink-0 rounded-2xl sm:size-24" />
          <div className="flex min-w-0 flex-col">
            <SkeletonLine className="w-36" />
            <span className="flex h-7 items-center">
              <Skeleton className="h-5 w-56 max-w-full rounded" />
            </span>
            <SkeletonLine className="w-64" />
          </div>
        </div>
        <SkeletonButton size="lg" className="w-full sm:w-60" />
      </div>
    </section>
  );
}

/** One row of the doctor's waiting list (QueueDesk WaitingRow). */
function DeskRowSkeleton() {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SkeletonLine className="w-40" />
        <SkeletonLine className="w-56" />
      </div>
      <SkeletonButton size="sm" className="w-24" />
    </li>
  );
}

/** The doctor's home (QueueDesk): room, day figures, waiting list, and today's finished patients. */
export function QueueDeskSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <DoctorRoomSkeleton />
      <div className="grid grid-cols-6 overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] lg:grid-cols-4">
        <DayFigureSkeleton label="Jadwal hari ini" className="col-span-6 border-b lg:col-span-1 lg:border-b-0" />
        <DayFigureSkeleton label="Kuota terisi" className="col-span-2 lg:col-span-1 lg:border-l" />
        <DayFigureSkeleton label="Menunggu saya" className="col-span-2 border-l lg:col-span-1" />
        <DayFigureSkeleton label="Selesai diperiksa" className="col-span-2 border-l lg:col-span-1" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel title="Antrean saya" dot="bg-line-waiting" link={{ href: '/queue', label: 'Papan antrean' }}>
          <ol className="divide-y">
            {placeholders(3).map((key) => (
              <DeskRowSkeleton key={key} />
            ))}
          </ol>
        </Panel>
        <Panel title="Pasien saya hari ini">
          <ul className="divide-y">
            {placeholders(3).map((key) => (
              <li key={key} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <SkeletonLine className="w-36" />
                  <SkeletonLine size="xs" className="w-28" />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function DayFigureSkeleton(props: { label: string; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5 px-3 py-4 sm:px-5', props.className)}>
      <span className="mb-0.5 text-xs font-medium text-muted-foreground">{props.label}</span>
      <SkeletonLine size="numeral-2xl" className="w-16" />
      <SkeletonLine size="xs" className="w-24" />
    </div>
  );
}
