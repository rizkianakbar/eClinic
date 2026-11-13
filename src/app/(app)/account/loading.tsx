import { AuthAccount } from '@/features/auth/auth-account';
import { getSession } from '@/lib/auth';

/** Akun saya is mostly the session: the real page, with only the profile details still loading. */
export default async function Loading() {
  const session = await getSession();

  if (!session) return null;

  return (
    <div data-route-loading aria-busy>
      <AuthAccount session={session} profile={undefined} />
    </div>
  );
}
