import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { getPurchase } from '@/features/inventory/inventory.service';
import { InventoryPurchase } from '@/features/inventory/inventory-purchase';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('inventory.titles.purchases');

export default async function PurchasePage(props: PageProps<'/inventory/purchases/[purchaseId]'>) {
  await requireRole(...PHARMACY_ROLES);

  const { purchaseId } = await props.params;

  if (!z.uuid().safeParse(purchaseId).success) notFound();

  const purchase = await getPurchase(await createClient(), purchaseId);

  if (!purchase) notFound();

  return <InventoryPurchase purchase={purchase} />;
}
