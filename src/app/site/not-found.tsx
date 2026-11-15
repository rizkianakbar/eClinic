import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { SiteFooter, SiteHeader } from '@/features/site/site-chrome';

export default function SiteNotFound() {
  const t = useTranslations('site.notFound');

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="tabular text-sm font-semibold text-primary">404</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          {t('home')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
