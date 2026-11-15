import { getOwnProfile } from '@/features/auth/auth.service';
import { AuthAccount } from '@/features/auth/auth-account';
import { COMPANY_IDLE_MINUTES } from '@/features/company/company-shell';
import { pageTitle } from '@/i18n/metadata';
import { getSession, requireAccount } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.account');

export default async function AccountPage() {
  const [{ account, currentId }, session] = await Promise.all([requireAccount(), getSession()]);
  const profile = await getOwnProfile(await createClient(), account.userId);

  return (
    <AuthAccount
      account={account}
      currentId={currentId}
      idleLogoutMinutes={session?.idleLogoutMinutes ?? COMPANY_IDLE_MINUTES}
      profile={profile}
    />
  );
}
