import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tag } from '@/components/ui/tag';
import { initials } from '@/features/patients/patients.lib';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import type { getPurchase } from './inventory.service';

type InventoryPurchaseProps = {
  purchase: NonNullable<Awaited<ReturnType<typeof getPurchase>>>;
};

/** A received purchase. Read-only: corrections go through stock opname. Each line became a batch. */
export function InventoryPurchase(props: InventoryPurchaseProps) {
  const t = useTranslations('inventory');
  const locale = useLocale();
  const { purchase } = props;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/inventory/purchases"
          className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeftIcon className="size-4" aria-hidden />
          {t('purchase.all')}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground">
              {initials(purchase.supplier?.name ?? '?')}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-[1.25rem] leading-tight font-semibold tracking-tight">{purchase.supplier?.name}</h2>
              <div className="flex flex-wrap gap-1.5">
                <Tag>
                  {t('purchase.invoice')}{' '}
                  <span className="tabular font-semibold">{purchase.invoice_no ?? t('purchases.noNumber')}</span>
                </Tag>
                <Tag>{formatDate(purchase.purchase_date, locale)}</Tag>
                <Tag>
                  {t('purchase.recorded', {
                    name: purchase.creator?.full_name ?? '',
                    time: formatDateTime(purchase.created_at, locale),
                  })}
                </Tag>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('purchase.total')}</p>
            <p className="numeral text-[1.75rem]">{formatRupiah(purchase.total)}</p>
          </div>
        </div>
        {purchase.note && <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">{purchase.note}</p>}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('purchase.colMedicine')}</TableHead>
            <TableHead>{t('purchase.colBatch')}</TableHead>
            <TableHead>{t('purchase.colExpiry')}</TableHead>
            <TableHead className="text-right">{t('purchase.colQty')}</TableHead>
            <TableHead className="text-right">{t('purchase.colCost')}</TableHead>
            <TableHead className="text-right">{t('purchase.colSubtotal')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchase.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link href={`/inventory/medicines/${item.medicine?.id}`} className="font-medium hover:underline">
                  {item.medicine?.name}
                </Link>
              </TableCell>
              <TableCell className="tabular">{item.batch_no}</TableCell>
              <TableCell>{formatDate(item.expiry_date, locale)}</TableCell>
              <TableCell className="text-right">
                {item.qty} {item.medicine?.unit}
              </TableCell>
              <TableCell className="text-right">{formatRupiah(item.unit_cost)}</TableCell>
              <TableCell className="text-right">{formatRupiah(item.subtotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="text-right font-medium">
              {t('purchase.footTotal')}
            </TableCell>
            <TableCell className="text-right font-semibold">{formatRupiah(purchase.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
