import type { Metadata } from "next";
import { PHARMACY_ROLES } from "@/features/inventory/inventory.constants";
import { listActiveSuppliers } from "@/features/inventory/inventory.service";
import { InventoryPurchaseForm } from "@/features/inventory/inventory-purchase-form";
import { requireRole } from "@/lib/auth";
import { todayInJakarta } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Catat pembelian" };

export default async function NewPurchasePage() {
  await requireRole(...PHARMACY_ROLES);
  const suppliers = await listActiveSuppliers(await createClient());
  return <InventoryPurchaseForm today={todayInJakarta()} suppliers={suppliers} />;
}
