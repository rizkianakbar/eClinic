import { AuthAccount } from '@/features/auth/auth-account';
import { COMPANY_IDLE_MINUTES } from '@/features/company/company-shell';
import { getSessionState } from '@/lib/auth';

/** Akun saya is mostly the session: the real page, with only the profile details still loading. */
export default async function Loading() {
  const state = await getSessionState();

  if (state.kind === 'signed-out') return null;

  const account = state.kind === 'ready' ? state.session : state.account;

  return (
    <div data-route-loading aria-busy>
      <AuthAccount
        account={account}
        currentId={state.kind === 'ready' ? state.session.clinicId : null}
        idleLogoutMinutes={state.kind === 'ready' ? state.session.idleLogoutMinutes : COMPANY_IDLE_MINUTES}
        profile={undefined}
      />
    </div>
  );
}
