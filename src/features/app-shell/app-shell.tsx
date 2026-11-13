import type { ReactNode } from 'react';
import { ROLE_LABELS } from '@/features/auth/auth.constants';
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

  return (
    <AppShellLiveProvider role={session.role} userId={session.userId} visitDate={todayInJakarta()}>
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center gap-3 bg-card px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
          {/* The logo's starting spot: the logo itself lives in the tab row (AppShellTabs) and docks there on scroll. */}
          <span className="size-8 shrink-0" aria-hidden />
          <Slash />
          <span className="max-w-44 truncate text-sm font-semibold" title={session.clinicName}>
            {session.clinicName}
          </span>
          <span className="hidden rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground sm:block">
            {ROLE_LABELS[session.role]}
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
              roleLabel={ROLE_LABELS[session.role]}
              clinicName={session.clinicName}
              canManageClinic={session.role === 'owner' || session.role === 'admin'}
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

/** The thin diagonal separator from Vercel's breadcrumb header. */
function Slash() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0 text-input"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}>
      <path d="M16.88 3.549L7.12 20.451" />
    </svg>
  );
}
