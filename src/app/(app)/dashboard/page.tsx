import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { STATION_HOME } from "@/features/app-shell/app-shell.lib";
import { Home } from "@/features/home/home";
import { VisitsLiveRefresh } from "@/features/visits/visits-live-refresh";
import { requireRole } from "@/lib/auth";
import { todayInJakarta } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beranda" };

export default async function DashboardPage() {
  const session = await requireRole();
  const station = STATION_HOME[session.role];
  if (station) redirect(station);
  const today = todayInJakarta();

  return (
    <>
      <VisitsLiveRefresh visitDate={today} />
      <Home session={session} supabase={await createClient()} today={today} />
    </>
  );
}
