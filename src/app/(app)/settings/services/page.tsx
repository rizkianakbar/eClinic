import type { Metadata } from "next";
import { listServices } from "@/features/billing/billing.service";
import { BillingServices } from "@/features/billing/billing-services";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tarif layanan" };

export default async function ServicesPage() {
  await requireRole("owner", "admin");
  const services = await listServices(await createClient());
  return <BillingServices services={services} />;
}
