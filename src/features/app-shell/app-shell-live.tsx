'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, type ReactNode, use, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useQueueBoard, useQueueRealtime } from '@/features/queue/queue.hooks';
import type { QueueVisit } from '@/features/queue/queue.lib';
import { journeyCounts } from '@/features/visits/visits.lib';
import type { Role } from '@/lib/auth';
import { myStationVisits, newArrivals, ROLE_STATION } from './app-shell.lib';

type Live = {
  role: Role;
  counts: ReturnType<typeof journeyCounts>;
  /** Patients waiting at the signed-in user's own station, oldest first. */
  mine: QueueVisit[];
  /** Where each of `mine` is opened. */
  hrefFor: (visit: QueueVisit) => string;
};

const LiveContext = createContext<Live | null>(null);

const ARRIVAL_HREF: Partial<Record<Role, (id: string) => string>> = {
  cashier: (id) => `/cashier/${id}`,
  pharmacist: (id) => `/pharmacy/${id}`,
  doctor: () => '/queue',
  nurse: () => '/queue',
};

type AppShellLiveProviderProps = {
  role: Role;
  userId: string;
  visitDate: string;
  children: ReactNode;
};

/**
 * Today's visits, live (one Realtime subscription for the whole shell).
 * Tells the user the moment someone arrives at their station: a toast with a
 * way in, and a count in the browser tab title for when the window is behind.
 */
export function AppShellLiveProvider(props: AppShellLiveProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  useQueueRealtime(props.visitDate);

  const board = useQueueBoard(props.visitDate);
  const visits = board.data ?? [];
  const mine = myStationVisits(visits, props.role, props.userId);
  const station = ROLE_STATION[props.role];
  const seen = useRef<Set<string> | null>(null);
  const hrefFor = (visit: QueueVisit) => ARRIVAL_HREF[props.role]?.(visit.id) ?? station?.href ?? '/dashboard';

  useEffect(() => {
    if (!board.data) return;

    const current = myStationVisits(board.data, props.role, props.userId);

    for (const visit of newArrivals(seen.current, current)) {
      const href = ARRIVAL_HREF[props.role]?.(visit.id);

      toast(`${visit.patient?.full_name ?? 'Pasien'} menunggu`, {
        description: `${station?.label} · nomor ${visit.queue_no}${visit.poli ? `, ${visit.poli.name}` : ''}`,
        duration: 10_000,
        action: href ? { label: 'Buka', onClick: () => router.push(href) } : undefined,
      });
    }

    seen.current = new Set(current.map((visit) => visit.id));
  }, [board.data, props.role, props.userId, router, station?.label]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Next resets document.title on every navigation, so pathname re-applies the count.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');

    document.title = mine.length > 0 ? `(${mine.length}) ${base}` : base;
  }, [mine.length, pathname]);

  return (
    <LiveContext value={{ role: props.role, counts: journeyCounts(visits), mine, hrefFor }}>
      {props.children}
    </LiveContext>
  );
}

export function useAppShellLive() {
  const live = use(LiveContext);

  if (!live) throw new Error('useAppShellLive must be used inside AppShellLiveProvider');

  return live;
}
