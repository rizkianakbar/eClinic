import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { listOpnameBatches } from '@/features/inventory/inventory.service';
import { InventoryOpnameForm } from '@/features/inventory/inventory-opname-form';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('inventory.titles.newOpname');

export default async function NewOpnamePage() {
  await requireRole(...PHARMACY_ROLES);

  return <InventoryOpnameForm batches={await listOpnameBatches(await createClient())} today={todayInJakarta()} />;
}
