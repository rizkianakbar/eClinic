import { redirect } from 'next/navigation';
import { AppShell } from '@/features/app-shell/app-shell';
import { CompanyShell } from '@/features/company/company-shell';
import { getSessionState } from '@/lib/auth';

/**
 * Akun saya belongs to the person, not to a branch: inside a branch it wears the branch shell; an owner on the
 * company pages (no branch) gets the company shell. Staff without a branch choose one first.
 */
export default async function AccountLayout(props: LayoutProps<'/'>) {
  const state = await getSessionState();

  if (state.kind === 'signed-out') redirect('/auth/signout');
  if (state.kind === 'ready') return <AppShell session={state.session}>{props.children}</AppShell>;
  if (state.account.role !== 'owner') redirect('/branch');

  return <CompanyShell account={state.account}>{props.children}</CompanyShell>;
}
