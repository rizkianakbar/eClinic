'use client';

import { Button } from '@/components/ui/button';

/** Opens the browser print dialog. Hidden on paper. */
export function PrintButton() {
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      Cetak
    </Button>
  );
}
