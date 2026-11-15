import { HeartPulseIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { clinicUrl, DEMO_SLUG, ROOT_DOMAIN } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import { SiteLocaleSwitch } from './site-locale-switch';

/** The demo clinic's sign-in page, with its one-click test accounts. */
export const DEMO_URL = clinicUrl(DEMO_SLUG, '/login');

type SiteLogoProps = {
  className?: string;
};

export function SiteLogo(props: SiteLogoProps) {
  const t = useTranslations('site.nav');

  return (
    <Link href="/" aria-label={t('home')} className={cn('flex items-center gap-2.5 font-semibold', props.className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]">
        <HeartPulseIcon className="size-4.5" aria-hidden />
      </span>
      e-clinic
    </Link>
  );
}

const SECTIONS = [
  { id: 'alur', key: 'journey' },
  { id: 'cabang', key: 'branches' },
  { id: 'akses', key: 'access' },
  { id: 'data', key: 'data' },
  { id: 'faq', key: 'faq' },
] as const;

/** Sticky, translucent header: logo, section links (wide screens), language, sign in, register. */
export function SiteHeader() {
  const t = useTranslations('site.nav');

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <SiteLogo />
        <nav aria-label={t('main')} className="hidden items-center gap-1 lg:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`/#${section.id}`}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {t(section.key)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <SiteLocaleSwitch />
          </div>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {t('login')}
          </Link>
          <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
            {t('signup')}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useTranslations('site');

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <SiteLogo />
          <p className="max-w-xs text-sm text-muted-foreground">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('nav.footer')} className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`/#${section.id}`} className="text-muted-foreground hover:text-foreground">
              {t(`nav.${section.key}`)}
            </a>
          ))}
          <a href={DEMO_URL} className="text-muted-foreground hover:text-foreground">
            {t('nav.demo')}
          </a>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            {t('nav.login')}
          </Link>
        </nav>
        <div className="sm:hidden">
          <SiteLocaleSwitch />
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
          <span className="flex gap-4">
            <span>{ROOT_DOMAIN}</span>
            <span>{t('footer.made')}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
