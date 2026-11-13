import { listConsultationServices, listPolis } from '@/features/settings/settings.service';
import { SettingsPolis } from '@/features/settings/settings-polis';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.polis');

export default async function PolisPage() {
  await requireRole('owner', 'admin');

  const supabase = await createClient();
  const [polis, consultationServices] = await Promise.all([listPolis(supabase), listConsultationServices(supabase)]);

  return <SettingsPolis polis={polis} consultationServices={consultationServices} />;
}
