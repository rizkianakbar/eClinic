import type { Metadata } from 'next';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { listStockOpnames } from '@/features/inventory/inventory.service';
import { InventoryOpnames } from '@/features/inventory/inventory-opnames';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Stok opname' };

export default async function OpnamesPage() {
  await requireRole(...PHARMACY_ROLES);

  return <InventoryOpnames opnames={await listStockOpnames(await createClient())} />;
}
