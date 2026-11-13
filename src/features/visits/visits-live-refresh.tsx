"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

type VisitsLiveRefreshProps = {
  visitDate: string;
};

/** Re-renders a server-rendered visit worklist when today's visits change, and every 60 s as a safety net. */
export function VisitsLiveRefresh(props: VisitsLiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`visits-refresh:${props.visitDate}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "visits", filter: `visit_date=eq.${props.visitDate}` },
        () => router.refresh(),
      )
      .subscribe();
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [props.visitDate, router]);

  return null;
}
