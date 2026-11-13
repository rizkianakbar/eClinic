import { getOwnProfile } from '@/features/auth/auth.service';
import { AuthAccount } from '@/features/auth/auth-account';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.account');

export default async function AccountPage() {
  const session = await requireRole();
  const profile = await getOwnProfile(await createClient(), session.userId);

  return <AuthAccount session={session} profile={profile} />;
}
