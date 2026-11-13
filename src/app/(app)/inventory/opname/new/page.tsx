import type { Metadata } from "next";
import { PHARMACY_ROLES } from "@/features/inventory/inventory.constants";
import { listOpnameBatches } from "@/features/inventory/inventory.service";
import { InventoryOpnameForm } from "@/features/inventory/inventory-opname-form";
import { requireRole } from "@/lib/auth";
import { todayInJakarta } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stok opname baru" };

export default async function NewOpnamePage() {
  await requireRole(...PHARMACY_ROLES);
  return <InventoryOpnameForm batches={await listOpnameBatches(await createClient())} today={todayInJakarta()} />;
}
