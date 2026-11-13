import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SkeletonLine } from '@/components/ui/skeleton';
import { AppShellTextSizePreview } from '@/features/app-shell/app-shell-text-size-preview';
import { initials } from '@/features/patients/patients.lib';
import type { Session } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import type { getOwnProfile } from './auth.service';
import { AuthChangePasswordForm } from './auth-change-password-form';
import { AuthLocaleSwitch } from './auth-locale-switch';
import { SignOutButton } from './auth-sign-out-button';

/** Keys, and the message key (account.shortcuts.*) of what they do. */
const SHORTCUTS = [
  [['Ctrl', 'K'], 'search'],
  [['/'], 'slash'],
  [['↑', '↓'], 'arrows'],
  [['Enter'], 'enter'],
  [['Ctrl', 'S'], 'save'],
  [['Esc'], 'esc'],
] as const;

type AuthAccountProps = {
  session: Session;
  /** undefined while it loads (the loading screen draws the same page around it). */
  profile: Awaited<ReturnType<typeof getOwnProfile>> | undefined;
};

/** Akun saya: who I am here, my password, this computer's text size, shortcuts, and signing out. */
export function AuthAccount(props: AuthAccountProps) {
  const { session } = props;
  const t = useTranslations();
  const locale = useLocale();
  const clinical = session.role === 'doctor' || session.role === 'nurse' || session.role === 'pharmacist';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <header className="flex flex-wrap items-center gap-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-xl font-semibold text-white shadow-[0_8px_24px_-8px_rgb(15_61_51/0.5)]">
          {initials(session.fullName)}
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{session.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {t('account.roleAt', { role: t(`roles.${session.role}`), clinic: session.clinicName })}
            {props.profile?.created_at && t('account.since', { date: formatDate(props.profile.created_at, locale) })}
          </p>
        </div>
      </header>

      <Section title={t('account.profile.title')} description={t('account.profile.description')}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label={t('account.profile.fullName')} value={session.fullName} />
          <Fact
            label={t('account.profile.email')}
            value={props.profile === undefined ? undefined : (props.profile?.email ?? '–')}
          />
          <Fact label={t('account.profile.role')} value={t(`roles.${session.role}`)} />
          <Fact label={t('account.profile.clinic')} value={session.clinicName} />
          {clinical && (
            <Fact
              label={t('account.profile.nik')}
              value={props.profile === undefined ? undefined : (props.profile?.nik ?? t('account.profile.notSet'))}
            />
          )}
          {clinical && (
            <Fact
              label={t('account.profile.sip')}
              value={
                props.profile === undefined ? undefined : (props.profile?.sip_number ?? t('account.profile.notSet'))
              }
            />
          )}
        </dl>
      </Section>

      <Section id="kata-sandi" title={t('account.password.title')} description={t('account.password.description')}>
        <AuthChangePasswordForm />
      </Section>

      <Section title={t('auth.locale.title')} description={t('auth.locale.description')}>
        <AuthLocaleSwitch />
      </Section>

      <Section title={t('account.display.title')} description={t('account.display.description')}>
        <AppShellTextSizePreview />
      </Section>

      <Section id="pintasan" title={t('account.shortcuts.title')} description={t('account.shortcuts.description')}>
        <ul className="flex flex-col divide-y">
          {SHORTCUTS.map(([keys, what]) => (
            <li key={what} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
              <span>{t(`account.shortcuts.${what}`)}</span>
              <span className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="flex h-6 min-w-6 items-center justify-center rounded-md border bg-background px-1.5 font-sans text-xs font-medium shadow-[0_1px_0_var(--border)]">
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={t('account.session.title')}
        description={t('account.session.description', { minutes: session.idleLogoutMinutes })}>
        <SignOutButton />
      </Section>
    </div>
  );
}

type SectionProps = {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Label and explanation on the left, the setting on the right. */
function Section(props: SectionProps) {
  return (
    <section
      id={props.id}
      className="scroll-mt-24 grid grid-cols-1 gap-4 border-t pt-8 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{props.title}</h2>
        <p className="text-[0.8125rem] text-muted-foreground">{props.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">{props.children}</div>
    </section>
  );
}

type FactProps = {
  label: string;
  /** undefined while the profile loads. */
  value: string | undefined;
};

function Fact(props: FactProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{props.label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">
        {props.value === undefined ? <SkeletonLine className="w-40" /> : props.value}
      </dd>
    </div>
  );
}
