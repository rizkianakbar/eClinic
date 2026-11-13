import { listSuppliers } from '@/features/inventory/inventory.service';
import { InventorySuppliers } from '@/features/inventory/inventory-suppliers';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.suppliers');

export default async function SuppliersPage() {
  await requireRole('owner', 'admin');

  const suppliers = await listSuppliers(await createClient());

  return <InventorySuppliers suppliers={suppliers} />;
}
