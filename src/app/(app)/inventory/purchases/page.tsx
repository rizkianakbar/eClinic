import type { Metadata } from 'next';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { parsePage } from '@/features/inventory/inventory.lib';
import { getPurchaseMonth, listPurchases } from '@/features/inventory/inventory.service';
import { InventoryPurchases } from '@/features/inventory/inventory-purchases';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pembelian' };

export default async function PurchasesPage(props: PageProps<'/inventory/purchases'>) {
  await requireRole(...PHARMACY_ROLES);

  const page = parsePage((await props.searchParams).page);
  const supabase = await createClient();

  const [result, month] = await Promise.all([
    listPurchases(supabase, page),
    getPurchaseMonth(supabase, `${todayInJakarta().slice(0, 7)}-01`),
  ]);

  return <InventoryPurchases {...result} page={page} month={month} />;
}
