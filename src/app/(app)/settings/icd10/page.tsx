import { countIcd10Codes } from '@/features/settings/settings.service';
import { SettingsIcd10 } from '@/features/settings/settings-icd10';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.icd10');

export default async function Icd10Page() {
  await requireRole('owner', 'admin');

  return <SettingsIcd10 count={await countIcd10Codes(await createClient())} />;
}
