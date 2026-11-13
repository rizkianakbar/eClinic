'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/** Opens the browser print dialog. Hidden on paper. */
export function PrintButton() {
  const t = useTranslations('common');

  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      {t('print')}
    </Button>
  );
}
