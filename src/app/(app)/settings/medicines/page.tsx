import { parsePage } from '@/features/inventory/inventory.lib';
import { listMedicines } from '@/features/inventory/inventory.service';
import { InventoryMedicines } from '@/features/inventory/inventory-medicines';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.medicines');

export default async function MedicinesPage(props: PageProps<'/settings/medicines'>) {
  await requireRole('owner', 'admin');

  const searchParams = await props.searchParams;
  const query = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim() ?? '';
  const page = parsePage(searchParams.page);
  const result = await listMedicines(await createClient(), { query, page });

  return <InventoryMedicines {...result} query={query} page={page} />;
}
