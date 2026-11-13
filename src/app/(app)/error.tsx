'use client';

import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, buttonVariants } from '@/components/ui/button';

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** A page failed to load (network, server). Data on other pages is safe. */
export default function AppError(props: AppErrorProps) {
  const t = useTranslations();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-status-cancelled-soft text-status-cancelled">
        <TriangleAlertIcon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">{t('app.error.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('app.error.description')}
          {props.error.digest && (
            <>
              {' '}
              {t('app.error.withCode')}{' '}
              <span className="tabular font-medium text-foreground">{props.error.digest}</span>
            </>
          )}
          .
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => props.reset()}>{t('common.retry')}</Button>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          {t('common.toHome')}
        </Link>
      </div>
    </div>
  );
}
