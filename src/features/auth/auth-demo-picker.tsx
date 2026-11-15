'use client';

import {
  ActivityIcon,
  ArrowRightIcon,
  ClipboardListIcon,
  LineChartIcon,
  LoaderCircleIcon,
  PillIcon,
  ReceiptIcon,
  StethoscopeIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import type { Role } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useTestAccountSignIn } from './auth.hooks';

type DemoAccount = { email: string; fullName: string; role: Role };

type AuthDemoPickerProps = {
  accounts: DemoAccount[];
};

type DemoRole = 'owner' | 'front_desk' | 'nurse' | 'doctor' | 'pharmacist' | 'cashier';

/**
 * Each role's desk, in the order of a visit; the owner leads (the person who decides to buy). Station roles wear
 * their journey station's colour, as everywhere in the app.
 */
const ROLES: { role: DemoRole; icon: ComponentType<{ className?: string }>; tone: string }[] = [
  { role: 'front_desk', icon: ClipboardListIcon, tone: 'bg-status-waiting-soft text-status-waiting' },
  { role: 'nurse', icon: ActivityIcon, tone: 'bg-status-waiting-soft text-status-waiting' },
  { role: 'doctor', icon: StethoscopeIcon, tone: 'bg-status-exam-soft text-status-exam' },
  { role: 'pharmacist', icon: PillIcon, tone: 'bg-status-pharmacy-soft text-status-pharmacy' },
  { role: 'cashier', icon: ReceiptIcon, tone: 'bg-status-cashier-soft text-status-cashier' },
];

/** One account per role; for doctors the general practitioner (the busiest demo queue). */
function accountFor(accounts: DemoAccount[], role: DemoRole) {
  const matches = accounts.filter((account) => account.role === role);

  return matches.find((account) => account.email.includes('umum')) ?? matches[0];
}

/**
 * The demo clinic's way in: "try it from any desk". A prospect picks a role, not a person, and sees in one line what
 * that desk shows; one click signs in.
 */
export function AuthDemoPicker(props: AuthDemoPickerProps) {
  const t = useTranslations('auth.demo');
  const signIn = useTestAccountSignIn();
  const owner = accountFor(props.accounts, 'owner');

  const pendingFor = (account: DemoAccount | undefined) =>
    Boolean(account) && (signIn.isPending || signIn.isSuccess) && signIn.variables === account?.email;

  return (
    <div className="flex flex-col gap-3">
      {owner && (
        <button
          type="button"
          disabled={signIn.isPending || signIn.isSuccess}
          onClick={() => signIn.mutate(owner.email)}
          className="group flex w-full items-center gap-4 rounded-xl border border-primary/30 bg-secondary/50 p-4 text-left shadow-[0_1px_2px_rgb(20_32_29/0.04)] outline-none transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-[0_8px_24px_-16px_rgb(15_47_40/0.4)] focus-visible:ring-3 focus-visible:ring-primary/20 disabled:opacity-70">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {pendingFor(owner) ? (
              <LoaderCircleIcon className="size-5 animate-spin" />
            ) : (
              <LineChartIcon className="size-5" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{t('roles.owner.title')}</span>
              <span className="rounded-md bg-primary/10 px-1.5 text-[0.6875rem] leading-5 font-medium text-primary">
                {t('recommended')}
              </span>
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">{t('roles.owner.body')}</span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ROLES.map(({ role, icon: Icon, tone }) => {
          const account = accountFor(props.accounts, role);

          if (!account) return null;

          return (
            <li key={role}>
              <button
                type="button"
                disabled={signIn.isPending || signIn.isSuccess}
                onClick={() => signIn.mutate(account.email)}
                className="group flex h-full w-full items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-[0_1px_2px_rgb(20_32_29/0.04)] outline-none transition-[border-color,box-shadow] hover:border-input hover:shadow-[0_4px_16px_-10px_rgb(15_47_40/0.35)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-70">
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone)}>
                  {pendingFor(account) ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{t(`roles.${role}.title`)}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t(`roles.${role}.body`)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
