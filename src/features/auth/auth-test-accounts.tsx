'use client';

import { FlaskConicalIcon, LoaderCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { initials } from '@/features/patients/patients.lib';
import type { Role } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useTestAccountSignIn } from './auth.hooks';

type AuthTestAccountsProps = {
  accounts: { email: string; fullName: string; role: Role }[];
};

/** Development only (the page renders it under `next dev`): sign in as any seeded test account in one click. */
export function AuthTestAccounts(props: AuthTestAccountsProps) {
  const t = useTranslations();
  const signIn = useTestAccountSignIn();

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-dashed border-amber-400/70 bg-amber-50/60 p-3.5">
      <div className="flex items-start gap-2">
        <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-amber-900">{t('auth.test.title')}</h2>
          <p className="text-xs text-amber-900/70">{t('auth.test.hint')}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-1.5">
        {props.accounts.map((account) => {
          const pending = signIn.isPending && signIn.variables === account.email;

          return (
            <li key={account.email}>
              <button
                type="button"
                disabled={signIn.isPending}
                onClick={() => signIn.mutate(account.email)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-left transition-[border-color,box-shadow,transform] duration-150 hover:border-primary/50 hover:shadow-[0_1px_3px_rgb(20_32_29/0.08)] active:scale-[0.98] disabled:opacity-60',
                  pending && 'border-primary',
                )}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.625rem] font-semibold text-secondary-foreground">
                  {pending ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    initials(account.fullName)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] font-medium">
                    {account.fullName.replace(/\s*\(Uji\)$/, '')}
                  </span>
                  <span className="block truncate text-[0.6875rem] text-muted-foreground">
                    {t(`roles.${account.role}`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
