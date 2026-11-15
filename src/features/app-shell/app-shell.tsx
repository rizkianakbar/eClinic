import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AuthIdleLogout } from '@/features/auth/auth-idle-logout';
import { PATIENT_EDITOR_ROLES, PATIENT_VIEWER_ROLES } from '@/features/patients/patients.constants';
import { initials } from '@/features/patients/patients.lib';
import { PatientsSheet } from '@/features/patients/patients-sheet';
import type { Session } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { navItemsFor } from './app-shell.lib';
import { AppShellBell } from './app-shell-bell';

import { AppShellLiveProvider } from './app-shell-live';
import { AppShellTabs } from './app-shell-nav';
import { AppShellNavProgress } from './app-shell-nav-progress';
import { AppShellPrefetch } from './app-shell-prefetch';
import { AppShellScope, Slash } from './app-shell-scope';
import { AppShellSearch } from './app-shell-search';
import { AppShellUserMenu } from './app-shell-user-menu';

type AppShellProps = {
  session: Session;
  children: ReactNode;
};

const has = (roles: readonly string[], role: string) => roles.includes(role);

/**
 * Vercel-style: a header (clinic / role, search, new patient, my station's
 * bell, account) above a sticky row of tabs with live counts. No sidebar;
 * the page uses the full width.
 */
export function AppShell(props: AppShellProps) {
  const { session } = props;
  const t = useTranslations();

  return (
    <AppShellLiveProvider role={session.role} userId={session.userId} visitDate={todayInJakarta()}>
      <div className="flex min-h-dvh flex-col">
        {/* box-content: the notch padding adds to the 4rem instead of squeezing it (--shell-dock-distance counts on it). */}
        <header className="box-content flex h-16 items-center gap-3 bg-card px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
          {/* The logo's starting spot: the logo itself lives in the tab row (AppShellTabs) and docks there on scroll. */}
          <span className="size-8 shrink-0" aria-hidden />
          <Slash />
          <AppShellScope
            organizationName={session.organizationName}
            current={session.branches.find((branch) => branch.id === session.clinicId) ?? null}
            branches={session.branches}
            isOwner={session.role === 'owner'}
            multiBranch={session.multiBranch}
          />
          <span className="hidden rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground sm:block">
            {t(`roles.${session.role}`)}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {has(PATIENT_VIEWER_ROLES, session.role) && <AppShellSearch />}
            {has(PATIENT_EDITOR_ROLES, session.role) && (
              <div className="hidden sm:block">
                <PatientsSheet mode="create" trigger="compact" />
              </div>
            )}
            <AppShellBell />
            <AppShellUserMenu
              fullName={session.fullName}
              initials={initials(session.fullName)}
              roleLabel={t(`roles.${session.role}`)}
              clinicName={session.clinicName}
              canManageClinic={session.role === 'owner' || session.role === 'admin'}
              isOwner={session.role === 'owner'}
              idleLogoutMinutes={session.idleLogoutMinutes}
              hasSearch={has(PATIENT_VIEWER_ROLES, session.role)}
            />
          </div>
        </header>

        <AppShellTabs items={navItemsFor(session.role)} />

        <main className="flex-1 px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto flex w-full max-w-360 flex-col gap-6">{props.children}</div>
        </main>
        <AuthIdleLogout minutes={session.idleLogoutMinutes} />
        <AppShellPrefetch />
        <AppShellNavProgress />
      </div>
    </AppShellLiveProvider>
  );
}
