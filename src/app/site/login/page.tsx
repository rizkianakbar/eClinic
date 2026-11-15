import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SiteLogo } from '@/features/site/site-chrome';
import { SiteLocaleSwitch } from '@/features/site/site-locale-switch';
import { TenantsSiteLoginForm } from '@/features/tenants/tenants-site-login-form';
import { pageTitle } from '@/i18n/metadata';
import { ROOT_DOMAIN } from '@/lib/tenant';

export const generateMetadata = pageTitle('tenants.login.title');

/**
 * Sign-in on the marketing site (owners and staff who don't know their clinic's address): the landing's light
 * canvas and a centred card. A clinic's own login page is the staff one, with the dark journey panel.
 */
export default async function SiteLoginPage() {
  const t = await getTranslations('tenants.login');

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip px-4 pt-[env(safe-area-inset-top)] pb-16 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-48 -z-10 h-160 bg-[radial-gradient(45%_50%_at_50%_45%,rgb(23_115_92/0.16),transparent_70%)]"
      />
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4">
        <SiteLogo />
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t('noAccount')}{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              {t('signup')}
            </Link>
          </p>
          <SiteLocaleSwitch />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center pt-10 sm:justify-center sm:pt-0">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em]">{t('title')}</h1>
            <p className="text-muted-foreground">{t('lead')}</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgb(20_32_29/0.04),0_24px_48px_-28px_rgb(15_47_40/0.4)] sm:p-8">
            <TenantsSiteLoginForm />
          </div>
          <div className="flex flex-col items-center gap-2 text-center text-[0.8125rem] text-muted-foreground">
            <p>{t('directHint', { domain: ROOT_DOMAIN })}</p>
            <p>{t('forgot')}</p>
            <p className="sm:hidden">
              {t('noAccount')}{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                {t('signup')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
