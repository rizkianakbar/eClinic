import type { Metadata } from "next";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { PageHeader } from "@/components/ui/page-header";
import { listLowStock, listPharmacyDesk } from "@/features/home/home.service";
import { HomePharmacy } from "@/features/home/home-pharmacy";
import { nearExpiryCutoff } from "@/features/inventory/inventory.lib";
import { countStockAlerts } from "@/features/inventory/inventory.service";
import { listDispensedToday } from "@/features/pharmacy/pharmacy.service";
import { VisitsLiveRefresh } from "@/features/visits/visits-live-refresh";
import { requireRole } from "@/lib/auth";
import { formatDate, todayInJakarta } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resep masuk" };

export default async function PharmacyPage() {
  await requireRole("pharmacist");
  const today = todayInJakarta();
  const supabase = await createClient();
  const [waiting, lowStock, dispensed, alerts] = await Promise.all([
    listPharmacyDesk(supabase),
    listLowStock(supabase),
    listDispensedToday(supabase),
    countStockAlerts(supabase, nearExpiryCutoff(today)),
  ]);

  return (
    <>
      <VisitsLiveRefresh visitDate={today} />
      <PageHeader
        title="Resep masuk"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {formatDate(today)}
            <LiveIndicator />
          </span>
        }
      />
      {/* eslint-disable-next-line react-hooks/purity -- server render time for the wait timers */}
      <HomePharmacy waiting={waiting} lowStock={lowStock} dispensed={dispensed} alerts={alerts} now={Date.now()} />
    </>
  );
}
