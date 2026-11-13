import { useLocale, useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { getStockOpname } from './inventory.service';

type InventoryOpnameProps = {
  opname: NonNullable<Awaited<ReturnType<typeof getStockOpname>>>;
};

/** A posted stock opname (read-only). */
export function InventoryOpname(props: InventoryOpnameProps) {
  const t = useTranslations('inventory');
  const locale = useLocale();
  const { opname } = props;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[1.125rem] font-semibold tracking-tight">
          {t('opname.title', { date: formatDate(opname.opname_date, locale) })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {opname.poster?.full_name} · {formatDateTime(opname.created_at, locale)}
          {opname.note && ` · ${opname.note}`}
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('opname.colMedicine')}</TableHead>
            <TableHead>{t('opname.colBatch')}</TableHead>
            <TableHead className="text-right">{t('opname.colSystem')}</TableHead>
            <TableHead className="text-right">{t('opname.colCounted')}</TableHead>
            <TableHead className="text-right">{t('opname.colDifference')}</TableHead>
            <TableHead>{t('opname.colReason')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opname.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.medicine?.name}</TableCell>
              <TableCell className="tabular">
                {item.batch?.batch_no}
                {item.batch && (
                  <span className="ml-1 font-sans text-xs text-muted-foreground">
                    {t('stock.ed', { date: formatDate(item.batch.expiry_date, locale) })}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">{item.system_qty}</TableCell>
              <TableCell className="text-right">{item.counted_qty}</TableCell>
              <TableCell className={cn('text-right', item.difference !== 0 && 'font-medium text-destructive')}>
                {item.difference > 0 ? `+${item.difference}` : item.difference}
              </TableCell>
              <TableCell>{item.reason ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
