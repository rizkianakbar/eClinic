import { ArrowDownLeftIcon, ArrowUpRightIcon, ChevronLeftIcon, PackageIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { PageLinks } from '@/components/ui/page-links';
import { Tag } from '@/components/ui/tag';
import { daysBetween, formatDate, formatDateTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import { MEDICINES_PAGE_SIZE, stockLevel } from './inventory.lib';
import type { getMedicineStock, listStockCard } from './inventory.service';

type InventoryStockCardProps = Awaited<ReturnType<typeof listStockCard>> & {
  medicine: NonNullable<Awaited<ReturnType<typeof getMedicineStock>>>;
  cutoff: string;
  today: string;
  page: number;
};

type CardText = ReturnType<typeof useTranslations<'inventory.card'>>;

/** "in 12 days", "in 3 months", or "expired". */
function untilExpiry(expiry: string, today: string, t: CardText) {
  const days = daysBetween(today, expiry);

  if (days < 0) return t('expired');
  if (days < 60) return t('days', { days });

  return t('months', { months: Math.floor(days / 30) });
}

type MovementType = 'purchase' | 'dispense' | 'consumable' | 'opname';

/** One medicine: how much is left against the minimum, which batches, and every movement (kartu stok). */
export function InventoryStockCard(props: InventoryStockCardProps) {
  const t = useTranslations('inventory.card');
  const ti = useTranslations('inventory');
  const locale = useLocale();
  const { medicine } = props;
  const qty = medicine.qty_on_hand ?? 0;
  const min = medicine.min_stock ?? 0;
  const level = stockLevel({ qty_on_hand: qty, min_stock: min });
  const value = medicine.batches.reduce((sum, batch) => sum + batch.qty_on_hand * batch.unit_cost, 0);
  const nearest = medicine.batches[0]?.expiry_date ?? null;
  const scale = Math.max(min * 3, qty, 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/inventory"
          className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeftIcon className="size-4" aria-hidden />
          {t('allMedicines')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-status-pharmacy-soft text-status-pharmacy">
            <PackageIcon className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-[1.25rem] leading-tight font-semibold tracking-tight">{medicine.name}</h2>
            <div className="flex flex-wrap gap-1.5">
              <Tag>{t('unit', { unit: medicine.unit ?? '' })}</Tag>
              <Tag>{t('minimum', { min })}</Tag>
              <Tag
                className={
                  level === 'ok'
                    ? 'border-transparent bg-secondary text-secondary-foreground'
                    : 'border-transparent bg-status-cancelled-soft text-status-cancelled'
                }>
                {ti(`level.${level}`)}
              </Tag>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h3 className="text-sm font-semibold">{t('stockNow')}</h3>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-col gap-3 border-b p-4">
              <p className="flex items-baseline gap-1.5">
                <span className={cn('numeral text-[2rem]', level !== 'ok' && 'text-status-cancelled')}>{qty}</span>
                <span className="text-sm text-muted-foreground">{medicine.unit}</span>
              </p>
              <div
                className="relative h-2 rounded-full bg-muted"
                title={ti('stock.minimum', { min, unit: medicine.unit ?? '' })}>
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    level === 'ok' ? 'bg-primary' : 'bg-status-cancelled',
                  )}
                  style={{ width: `${Math.max(2, (qty / scale) * 100)}%` }}
                />
                <span
                  className="absolute -top-1 h-4 w-px bg-foreground/50"
                  style={{ left: `${(min / scale) * 100}%` }}
                  aria-hidden
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('minNote', { min })}</p>
            </div>
            <dl className="grid grid-cols-2 gap-px border-b bg-border">
              <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{t('value')}</dt>
                <dd className="text-[0.9375rem] font-semibold">{formatRupiah(value)}</dd>
              </div>
              <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{t('nearest')}</dt>
                <dd
                  className={cn(
                    'text-[0.9375rem] font-semibold',
                    nearest && nearest <= props.cutoff && 'text-status-cancelled',
                  )}>
                  {nearest ? untilExpiry(nearest, props.today, t) : '–'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col">
              <p className="flex items-center justify-between px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                {t('batches')}
                <span>{t('fromTop')}</span>
              </p>
              {medicine.batches.length === 0 ? (
                <p className="px-4 pt-1 pb-4 text-sm text-muted-foreground">{t('outOfStock')}</p>
              ) : (
                <ul className="pb-1">
                  {medicine.batches.map((batch, index) => {
                    const soon = batch.expiry_date <= props.cutoff;

                    return (
                      <li
                        key={batch.id}
                        className="flex items-center gap-3 border-t px-4 py-2.5 text-sm first:border-t-0">
                        <span
                          className={cn(
                            'tabular flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                            index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}>
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="tabular block font-medium">{batch.batch_no}</span>
                          <span
                            className={cn(
                              'block text-xs',
                              soon ? 'font-medium text-status-cancelled' : 'text-muted-foreground',
                            )}>
                            {ti('stock.ed', { date: formatDate(batch.expiry_date, locale) })} ·{' '}
                            {untilExpiry(batch.expiry_date, props.today, t)}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="tabular block font-semibold">{batch.qty_on_hand}</span>
                          <span className="tabular block text-xs text-muted-foreground">
                            {formatRupiah(batch.unit_cost)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {t('title')}
            <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
              {props.total}
            </span>
          </h3>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            {props.movements.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('noMovements')}</p>
            ) : (
              <ul>
                {props.movements.map((movement) => {
                  const change = movement.qty ?? 0;
                  const incoming = change > 0;

                  return (
                    <li key={movement.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg',
                          incoming ? 'bg-secondary text-primary' : 'bg-status-cancelled-soft text-status-cancelled',
                        )}>
                        {incoming ? (
                          <ArrowDownLeftIcon className="size-4" aria-hidden />
                        ) : (
                          <ArrowUpRightIcon className="size-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {movement.type ? ti(`movement.${movement.type as MovementType}`) : '–'}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t('batch')} <span className="tabular">{movement.batch_no}</span> ·{' '}
                          {movement.created_by_name ?? t('system')} ·{' '}
                          {movement.created_at ? formatDateTime(movement.created_at, locale) : '-'}
                        </span>
                      </span>
                      <span className="text-right">
                        <span
                          className={cn(
                            'tabular block text-sm font-semibold',
                            incoming ? 'text-primary' : 'text-status-cancelled',
                          )}>
                          {incoming ? '+' : '−'}
                          {Math.abs(change)}
                        </span>
                        <span className="tabular block text-xs text-muted-foreground">
                          {t('balance', { balance: movement.balance ?? 0 })}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <PageLinks
            page={props.page}
            pageSize={MEDICINES_PAGE_SIZE}
            total={props.total}
            countLabel={t('movementCount', { count: props.total })}
          />
        </section>
      </div>
    </div>
  );
}
