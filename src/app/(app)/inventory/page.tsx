import type { Metadata } from 'next';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { nearExpiryCutoff, parsePage, parseStockFilter } from '@/features/inventory/inventory.lib';
import { countStockAlerts, listStock } from '@/features/inventory/inventory.service';
import { InventoryStock } from '@/features/inventory/inventory-stock';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Stok obat' };

export default async function StockPage(props: PageProps<'/inventory'>) {
  await requireRole(...PHARMACY_ROLES);

  const searchParams = await props.searchParams;
  const filter = parseStockFilter(searchParams.filter);
  const query = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim() ?? '';
  const page = parsePage(searchParams.page);
  const cutoff = nearExpiryCutoff(todayInJakarta());

  const supabase = await createClient();

  const [stock, alerts] = await Promise.all([
    listStock(supabase, { filter, query, page, cutoff }),
    countStockAlerts(supabase, cutoff),
  ]);

  return <InventoryStock {...stock} alerts={alerts} filter={filter} query={query} page={page} cutoff={cutoff} />;
}
