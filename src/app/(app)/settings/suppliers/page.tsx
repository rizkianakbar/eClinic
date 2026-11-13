import type { Metadata } from 'next';
import { listSuppliers } from '@/features/inventory/inventory.service';
import { InventorySuppliers } from '@/features/inventory/inventory-suppliers';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Supplier' };

export default async function SuppliersPage() {
  await requireRole('owner', 'admin');

  const suppliers = await listSuppliers(await createClient());

  return <InventorySuppliers suppliers={suppliers} />;
}
