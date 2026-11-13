import { PackageSearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLinks } from '@/components/ui/page-links';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { MEDICINES_PAGE_SIZE, NEAR_EXPIRY_MONTHS, STOCK_FILTERS, type StockFilter, stockLevel } from './inventory.lib';
import type { countStockAlerts, listStock } from './inventory.service';
import { InventorySearch } from './inventory-search';

type InventoryStockProps = Awaited<ReturnType<typeof listStock>> & {
  alerts: Awaited<ReturnType<typeof countStockAlerts>>;
  filter: StockFilter;
  query: string;
  page: number;
  cutoff: string;
};

export function InventoryStock(props: InventoryStockProps) {
  const t = useTranslations('inventory');
  const locale = useLocale();

  const counts: Record<StockFilter, number | null> = {
    all: null,
    low: props.alerts.low,
    expiring: props.alerts.expiring,
  };

  const filterHref = (filter: StockFilter) =>
    `?${new URLSearchParams({ ...(filter !== 'all' && { filter }), ...(props.query && { q: props.query }) })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={segmentedGroup}>
          {STOCK_FILTERS.map((filter) => (
            <Link
              key={filter}
              href={filterHref(filter)}
              aria-current={props.filter === filter ? 'true' : undefined}
              className={segmentedItem(props.filter === filter)}>
              {t(`filter.${filter}`)}
              {counts[filter] ? (
                <span className="tabular rounded-full bg-status-cancelled px-1.5 text-[0.6875rem] leading-4 font-semibold text-white">
                  {counts[filter]}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
        <InventorySearch query={props.query} placeholder={t('searchMedicine')} />
      </div>
      {props.filter === 'expiring' && (
        <p className="text-sm text-muted-foreground">
          {t('stock.expiringNote', { months: NEAR_EXPIRY_MONTHS, date: formatDate(props.cutoff, locale) })}
        </p>
      )}

      {props.stock.length === 0 ? (
        <EmptyState
          icon={PackageSearchIcon}
          title={props.query || props.filter !== 'all' ? t('stock.noMatch') : t('stock.noActive')}
          description={props.query || props.filter !== 'all' ? t('stock.noMatchHint') : t('stock.noActiveHint')}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('stock.colMedicine')}</TableHead>
              <TableHead className="w-[46%] sm:w-[34%]">{t('stock.colStock')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('stock.colExpiry')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.stock.map((item) => {
              const level = stockLevel({
                qty_on_hand: item.qtyOnHand,
                min_stock: item.minStock,
              });

              const expiringSoon = item.earliestExpiry !== null && item.earliestExpiry <= props.cutoff;

              return (
                <TableRow key={item.medicineId}>
                  <TableCell>
                    <Link href={`/inventory/medicines/${item.medicineId}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    {/* Phones: the nearest expiry folds under the name; the stock bar keeps its room. */}
                    <span
                      className={cn(
                        'block text-[0.8125rem] sm:hidden',
                        expiringSoon ? 'font-medium text-status-cancelled' : 'text-muted-foreground',
                      )}>
                      {item.earliestExpiry
                        ? t('stock.ed', { date: formatDate(item.earliestExpiry, locale) })
                        : t('stock.noBatch')}
                      {expiringSoon && ` · ${t('stock.soonShort')}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StockLevel qty={item.qtyOnHand} min={item.minStock} unit={item.unit} level={level} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.earliestExpiry ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-2',
                          expiringSoon && 'font-medium text-status-cancelled',
                        )}>
                        {formatDate(item.earliestExpiry, locale)}
                        {expiringSoon && (
                          <span className="rounded-md bg-status-cancelled-soft px-1.5 text-xs leading-5 font-semibold">
                            {t('stock.soon')}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('stock.noBatch')}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <PageLinks
        page={props.page}
        pageSize={MEDICINES_PAGE_SIZE}
        total={props.total}
        params={{
          ...(props.filter !== 'all' && { filter: props.filter }),
          ...(props.query && { q: props.query }),
        }}
        countLabel={t('medicineCount', { count: props.total })}
      />
    </div>
  );
}

type StockLevelProps = {
  qty: number;
  min: number;
  unit: string;
  level: ReturnType<typeof stockLevel>;
};

/** Quantity against the minimum: the bar fills to three times the minimum; the tick marks the minimum. */
function StockLevel(props: StockLevelProps) {
  const t = useTranslations('inventory');
  const scale = Math.max(props.min * 3, props.qty, 1);
  const tone = props.level === 'ok' ? 'bg-primary' : 'bg-status-cancelled';

  return (
    <div className="flex items-center gap-3">
      <span className="tabular w-24 shrink-0 text-sm">
        <span className={cn('font-semibold', props.level !== 'ok' && 'text-status-cancelled')}>{props.qty}</span>{' '}
        <span className="text-muted-foreground">{props.unit}</span>
      </span>
      <span
        className="relative h-1.5 flex-1 rounded-full bg-muted"
        title={t('stock.minimum', { min: props.min, unit: props.unit })}>
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full', tone)}
          style={{ width: `${Math.max(2, (props.qty / scale) * 100)}%` }}
        />
        <span
          className="absolute -top-1 h-3.5 w-px bg-foreground/40"
          style={{ left: `${(props.min / scale) * 100}%` }}
          aria-hidden
        />
      </span>
      {/* "Aman" stays quiet so the rows that need action are the ones that stand out. */}
      <span className="hidden w-18 shrink-0 sm:block">
        <span
          className={cn(
            'inline-flex h-5 items-center rounded-md text-xs',
            props.level === 'ok'
              ? 'text-muted-foreground/70'
              : 'bg-status-cancelled-soft px-1.5 font-medium text-status-cancelled',
          )}>
          {t(`level.${props.level}`)}
        </span>
      </span>
    </div>
  );
}
