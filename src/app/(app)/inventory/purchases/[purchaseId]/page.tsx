import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PHARMACY_ROLES } from "@/features/inventory/inventory.constants";
import { getPurchase } from "@/features/inventory/inventory.service";
import { InventoryPurchase } from "@/features/inventory/inventory-purchase";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pembelian" };

export default async function PurchasePage(props: PageProps<"/inventory/purchases/[purchaseId]">) {
  await requireRole(...PHARMACY_ROLES);
  const { purchaseId } = await props.params;
  if (!z.uuid().safeParse(purchaseId).success) notFound();
  const purchase = await getPurchase(await createClient(), purchaseId);
  if (!purchase) notFound();
  return <InventoryPurchase purchase={purchase} />;
}
