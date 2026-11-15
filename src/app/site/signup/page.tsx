import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteLogo } from '@/features/site/site-chrome';
import { SiteLocaleSwitch } from '@/features/site/site-locale-switch';
import { pageSeo } from '@/features/site/site-seo';
import { TenantsSignupForm } from '@/features/tenants/tenants-signup-form';
import { isLocale } from '@/i18n/locales';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations('site.meta'), getLocale()]);

  return pageSeo({
    title: t('signupTitle'),
    description: t('signupDescription'),
    path: '/signup',
    locale: isLocale(locale) ? locale : 'id',
    imageAlt: t('ogAlt'),
  });
}

export default async function SignupPage() {
  const t = await getTranslations('tenants.signup');

  return (
    <TenantsSignupForm
      header={
        <header className="flex h-16 items-center justify-between gap-4">
          <SiteLogo />
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {t('haveAccount')}{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t('login')}
              </Link>
            </p>
            <SiteLocaleSwitch />
          </div>
        </header>
      }
    />
  );
}
