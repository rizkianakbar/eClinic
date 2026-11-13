import type { Metadata } from 'next';
import { getOwnProfile } from '@/features/auth/auth.service';
import { AuthAccount } from '@/features/auth/auth-account';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Akun saya' };

export default async function AccountPage() {
  const session = await requireRole();
  const profile = await getOwnProfile(await createClient(), session.userId);

  return <AuthAccount session={session} profile={profile} />;
}
