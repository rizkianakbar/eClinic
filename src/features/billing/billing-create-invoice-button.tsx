'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useActionMutation } from '@/lib/query';
import { createInvoiceAction } from './billing.actions';

type BillingCreateInvoiceButtonProps = {
  visitId: string;
};

/**
 * Builds the invoice from the visit as soon as the cashier opens it (the
 * database returns the existing one if it is already there). The button is
 * the fallback when that first attempt fails.
 */
export function BillingCreateInvoiceButton(props: BillingCreateInvoiceButtonProps) {
  const t = useTranslations('billing.create');
  const create = useActionMutation(() => createInvoiceAction(props.visitId));
  const started = useRef(false);
  const { mutate } = create;

  useEffect(() => {
    if (started.current) return;

    started.current = true;
    mutate();
  }, [mutate]);

  if (create.isError) {
    return (
      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        {t('retry')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="status" aria-busy aria-label={t('preparing')}>
      <p className="text-sm text-muted-foreground">{t('preparingText')}</p>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-xl bg-muted/70" />
      ))}
    </div>
  );
}
