import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  const t = useTranslations();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="numeral text-[3rem] text-muted-foreground/60">404</p>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">{t('app.notFound.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('app.notFound.description')}</p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        {t('common.toHome')}
      </Link>
    </main>
  );
}
