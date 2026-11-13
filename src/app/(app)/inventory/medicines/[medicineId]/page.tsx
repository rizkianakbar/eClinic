import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { nearExpiryCutoff, parsePage } from '@/features/inventory/inventory.lib';
import { getMedicineStock, listStockCard } from '@/features/inventory/inventory.service';
import { InventoryStockCard } from '@/features/inventory/inventory-stock-card';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('inventory.titles.card');

export default async function StockCardPage(props: PageProps<'/inventory/medicines/[medicineId]'>) {
  await requireRole(...PHARMACY_ROLES);

  const { medicineId } = await props.params;

  if (!z.uuid().safeParse(medicineId).success) notFound();

  const page = parsePage((await props.searchParams).page);

  const supabase = await createClient();

  const [medicine, card] = await Promise.all([
    getMedicineStock(supabase, medicineId),
    listStockCard(supabase, medicineId, page),
  ]);

  if (!medicine) notFound();

  const today = todayInJakarta();

  return (
    <InventoryStockCard {...card} medicine={medicine} page={page} today={today} cutoff={nearExpiryCutoff(today)} />
  );
}
