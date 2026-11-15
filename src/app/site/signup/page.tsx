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
