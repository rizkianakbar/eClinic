import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SiteLogo } from '@/features/site/site-chrome';
import { SiteLocaleSwitch } from '@/features/site/site-locale-switch';
import { TenantsSiteLoginForm } from '@/features/tenants/tenants-site-login-form';
import { pageTitle } from '@/i18n/metadata';

export const generateMetadata = pageTitle('tenants.login.title');

export default async function SiteLoginPage() {
  const t = await getTranslations('tenants.login');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <SiteLogo />
        <SiteLocaleSwitch />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 sm:items-center sm:px-6 sm:pt-0">
        <div className="flex w-full max-w-sm flex-col gap-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('lead')}</p>
          </div>
          <TenantsSiteLoginForm />
          <p className="text-[0.8125rem] text-muted-foreground">{t('forgot')}</p>
          <p className="border-t pt-5 text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              {t('signup')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
