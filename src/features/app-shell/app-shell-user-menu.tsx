'use client';

import {
  BuildingIcon,
  HistoryIcon,
  KeyboardIcon,
  KeyRoundIcon,
  LogOutIcon,
  TimerIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignOut } from '@/features/auth/auth.hooks';

type AppShellUserMenuProps = {
  fullName: string;
  initials: string;
  roleLabel: string;
  clinicName: string;
  /** Owner and admin also get shortcuts into clinic settings. */
  canManageClinic: boolean;
  idleLogoutMinutes: number;
  /** Roles with patient search see its shortcut next to "Pintasan keyboard". */
  hasSearch: boolean;
};

function Kbd(props: { children: string }) {
  return (
    <kbd className="ml-auto flex h-5 items-center rounded border bg-background px-1.5 font-sans text-[0.6875rem] font-medium text-muted-foreground">
      {props.children}
    </kbd>
  );
}

/** Everything about "me": who is signed in, my account, the clinic (for managers), and sign out kept apart. */
export function AppShellUserMenu(props: AppShellUserMenuProps) {
  const t = useTranslations('shell.menu');
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('label')}
        className="flex size-9 items-center justify-center rounded-full transition-shadow hover:ring-4 hover:ring-black/5 data-popup-open:ring-4 data-popup-open:ring-black/5">
        <span className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-[0.6875rem] font-semibold text-white">
          {props.initials}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <div className="flex items-center gap-3 px-2 pt-2 pb-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-xs font-semibold text-white">
            {props.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{props.fullName}</span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="shrink-0 rounded-md bg-secondary px-1.5 leading-5 font-medium text-secondary-foreground">
                {props.roleLabel}
              </span>
              <span className="truncate">{props.clinicName}</span>
            </span>
          </span>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLinkItem render={<Link href="/account" />}>
            <UserRoundIcon />
            {t('account')}
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/account#kata-sandi" />}>
            <KeyRoundIcon />
            {t('password')}
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/account#pintasan" />}>
            <KeyboardIcon />
            {t('shortcuts')}
            {props.hasSearch && <Kbd>Ctrl K</Kbd>}
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>

        {props.canManageClinic && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('clinic')}</DropdownMenuLabel>
              <DropdownMenuLinkItem render={<Link href="/settings/clinic" />}>
                <BuildingIcon />
                {t('clinicProfile')}
              </DropdownMenuLinkItem>
              <DropdownMenuLinkItem render={<Link href="/settings/staff" />}>
                <UsersIcon />
                {t('staff')}
              </DropdownMenuLinkItem>
              <DropdownMenuLinkItem render={<Link href="/settings/activity" />}>
                <HistoryIcon />
                {t('activity')}
              </DropdownMenuLinkItem>
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <p className="flex items-start gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <TimerIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {t('idle', { minutes: props.idleLogoutMinutes })}
        </p>
        <DropdownMenuItem tone="destructive" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
          <LogOutIcon />
          {signOut.isPending ? t('signingOut') : t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
