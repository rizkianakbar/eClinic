import type { Metadata } from "next";
import { parsePage } from "@/features/inventory/inventory.lib";
import { listMedicines } from "@/features/inventory/inventory.service";
import { InventoryMedicines } from "@/features/inventory/inventory-medicines";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Obat" };

export default async function MedicinesPage(props: PageProps<"/settings/medicines">) {
  await requireRole("owner", "admin");
  const searchParams = await props.searchParams;
  const query = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim() ?? "";
  const page = parsePage(searchParams.page);
  const result = await listMedicines(await createClient(), { query, page });
  return <InventoryMedicines {...result} query={query} page={page} />;
}
