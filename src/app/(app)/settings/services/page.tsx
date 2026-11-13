import { listServices } from '@/features/billing/billing.service';
import { BillingServices } from '@/features/billing/billing-services';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.services');

export default async function ServicesPage() {
  await requireRole('owner', 'admin');

  const services = await listServices(await createClient());

  return <BillingServices services={services} />;
}
