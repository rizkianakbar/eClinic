import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SiteLogo } from '@/features/site/site-chrome';
import { SiteLocaleSwitch } from '@/features/site/site-locale-switch';
import { TenantsSignupForm } from '@/features/tenants/tenants-signup-form';
import { pageTitle } from '@/i18n/metadata';

export const generateMetadata = pageTitle('tenants.signup.title');

export default async function SignupPage() {
  const t = await getTranslations('tenants.signup');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <SiteLogo />
        <SiteLocaleSwitch />
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <div className="flex max-w-xl flex-col gap-2">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-[2.25rem]">{t('title')}</h1>
          <p className="text-[1.0625rem] leading-relaxed text-muted-foreground">{t('lead')}</p>
          <p className="text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
        <TenantsSignupForm />
      </main>
    </div>
  );
}
