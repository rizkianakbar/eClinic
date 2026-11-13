import { ClipboardCheckIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dates';
import type { listStockOpnames } from './inventory.service';

type InventoryOpnamesProps = {
  opnames: Awaited<ReturnType<typeof listStockOpnames>>;
};

export function InventoryOpnames(props: InventoryOpnamesProps) {
  const t = useTranslations('inventory.opnames');
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
        <Link href="/inventory/opname/new" className={buttonVariants()}>
          <PlusIcon />
          {t('start')}
        </Link>
      </div>
      {props.opnames.length === 0 ? (
        <EmptyState
          icon={ClipboardCheckIcon}
          title={t('empty')}
          description={t('emptyHint')}
          action={
            <Link href="/inventory/opname/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t('startFirst')}
            </Link>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colTime')}</TableHead>
              <TableHead>{t('colBy')}</TableHead>
              <TableHead className="text-right">{t('colCounted')}</TableHead>
              <TableHead className="text-right">{t('colDifference')}</TableHead>
              <TableHead>{t('colNote')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.opnames.map((opname) => (
              <TableRow key={opname.id} className="relative">
                <TableCell>
                  <Link
                    href={`/inventory/opname/${opname.id}`}
                    className="font-medium after:absolute after:inset-0 hover:underline">
                    {formatDateTime(opname.created_at, locale)}
                  </Link>
                </TableCell>
                <TableCell>{opname.poster?.full_name}</TableCell>
                <TableCell className="tabular text-right">{opname.items.length}</TableCell>
                <TableCell className="text-right">
                  {(() => {
                    const differences = opname.items.filter((item) => item.difference !== 0).length;

                    return differences === 0 ? (
                      <span className="rounded-md bg-secondary px-1.5 text-xs leading-5 font-medium text-secondary-foreground">
                        {t('allMatch')}
                      </span>
                    ) : (
                      <span className="tabular rounded-md bg-status-waiting-soft px-1.5 text-xs leading-5 font-medium text-status-waiting">
                        {t('differences', { count: differences })}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="max-w-xs truncate">{opname.note ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
