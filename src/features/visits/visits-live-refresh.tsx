"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueueBoard } from "@/features/queue/queue.hooks";

type VisitsLiveRefreshProps = {
  visitDate: string;
};

/**
 * Re-renders a server-rendered worklist (cashier, pharmacy, registration,
 * Beranda) when today's visits really change. It rides the shell's one
 * Realtime subscription through the shared queue query: no extra channel, and
 * no server render when a refetch brings back the same visits.
 */
export function VisitsLiveRefresh(props: VisitsLiveRefreshProps) {
  const router = useRouter();
  const board = useQueueBoard(props.visitDate);
  const signature = board.data?.map((visit) => `${visit.id}:${visit.status}:${visit.updated_at}`).join("|");
  const previous = useRef(signature);

  useEffect(() => {
    if (signature === undefined) return;
    if (previous.current !== undefined && previous.current !== signature) router.refresh();
    previous.current = signature;
  }, [signature, router]);

  return null;
}
