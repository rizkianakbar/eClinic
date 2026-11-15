import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { COMPANY_NAV_ITEMS } from '@/features/app-shell/app-shell.lib';
import { AppShellTabs } from '@/features/app-shell/app-shell-nav';
import { AppShellNavProgress } from '@/features/app-shell/app-shell-nav-progress';
import { AppShellPrefetch } from '@/features/app-shell/app-shell-prefetch';
import { AppShellScope, Slash } from '@/features/app-shell/app-shell-scope';
import { AppShellUserMenu } from '@/features/app-shell/app-shell-user-menu';
import { AuthIdleLogout } from '@/features/auth/auth-idle-logout';
import { initials } from '@/features/patients/patients.lib';
import type { Account } from '@/lib/auth';

/** No branch in scope, so no branch setting applies: the default idle timeout for shared computers. */
export const COMPANY_IDLE_MINUTES = 15;

type CompanyShellProps = {
  account: Account;
  children: ReactNode;
};

/**
 * The company scope (Vercel's team pages): the same header and tab row as a branch, with `Company / Pilih cabang`
 * in the breadcrumb and the company's tabs. No live queue here: queues belong to branches.
 */
export function CompanyShell(props: CompanyShellProps) {
  const { account } = props;
  const t = useTranslations();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="box-content flex h-16 items-center gap-3 bg-card px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <span className="size-8 shrink-0" aria-hidden />
        <Slash />
        <AppShellScope
          organizationName={account.organizationName}
          current={null}
          branches={account.branches}
          isOwner
          multiBranch={account.multiBranch}
        />
        <div className="ml-auto flex items-center gap-2">
          <AppShellUserMenu
            fullName={account.fullName}
            initials={initials(account.fullName)}
            roleLabel={t(`roles.${account.role}`)}
            clinicName={account.organizationName}
            canManageClinic={false}
            isOwner
            idleLogoutMinutes={COMPANY_IDLE_MINUTES}
            hasSearch={false}
          />
        </div>
      </header>

      <AppShellTabs items={COMPANY_NAV_ITEMS} homeHref="/company" />

      <main className="flex-1 px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-6">{props.children}</div>
      </main>
      <AuthIdleLogout minutes={COMPANY_IDLE_MINUTES} />
      <AppShellPrefetch />
      <AppShellNavProgress />
    </div>
  );
}
