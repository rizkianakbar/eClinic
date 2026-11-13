import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClinicProfile } from '@/features/settings/settings.service';
import { SettingsClinicForm } from '@/features/settings/settings-clinic-form';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Profil klinik' };

export default async function ClinicProfilePage() {
  await requireRole('owner', 'admin');

  const clinic = await getClinicProfile(await createClient());

  if (!clinic) notFound();

  return <SettingsClinicForm key={clinic.updated_at} clinic={clinic} />;
}
