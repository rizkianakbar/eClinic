import { SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';

export default function AppNotFound() {
  const t = useTranslations();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <SearchXIcon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">{t('app.dataNotFound.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('app.dataNotFound.description')}</p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
        {t('common.toHome')}
      </Link>
    </div>
  );
}
