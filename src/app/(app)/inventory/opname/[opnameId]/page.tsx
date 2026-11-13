import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { getStockOpname } from '@/features/inventory/inventory.service';
import { InventoryOpname } from '@/features/inventory/inventory-opname';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Stok opname' };

export default async function OpnamePage(props: PageProps<'/inventory/opname/[opnameId]'>) {
  await requireRole(...PHARMACY_ROLES);

  const { opnameId } = await props.params;

  if (!z.uuid().safeParse(opnameId).success) notFound();

  const opname = await getStockOpname(await createClient(), opnameId);

  if (!opname) notFound();

  return <InventoryOpname opname={opname} />;
}
