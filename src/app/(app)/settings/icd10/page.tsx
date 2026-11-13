import type { Metadata } from 'next';
import { countIcd10Codes } from '@/features/settings/settings.service';
import { SettingsIcd10 } from '@/features/settings/settings-icd10';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'ICD-10' };

export default async function Icd10Page() {
  await requireRole('owner', 'admin');

  return <SettingsIcd10 count={await countIcd10Codes(await createClient())} />;
}
