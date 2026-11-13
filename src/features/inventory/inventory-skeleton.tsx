import { ChevronLeftIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { SegmentedSkeleton } from '@/components/ui/segmented-skeleton';
import {
  placeholders,
  Skeleton,
  SkeletonAction,
  SkeletonButton,
  SkeletonLine,
  SkeletonStats,
} from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { cn } from '@/lib/utils';
import { STOCK_FILTERS } from './inventory.lib';
import { InventorySearchSkeleton } from './inventory-search';

/** The stock summary beside the Stok obat title (it streams in on its own). */
export function InventorySummarySkeleton() {
  const t = useTranslations('inventory.summary');

  return (
    <SkeletonStats
      items={(['active', 'value', 'low', 'expiring'] as const).map((key) => ({
        label: t(key),
        hint: t(`${key}Hint`),
      }))}
    />
  );
}

/** Stok: filter, search, and the stock rows (name, level bar, nearest expiry). */
export function InventoryStockSkeleton() {
  const t = useTranslations('inventory');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedSkeleton options={STOCK_FILTERS.map((filter) => t(`filter.${filter}`))} />
        <InventorySearchSkeleton placeholder={t('searchMedicine')} />
      </div>
      <TableSkeleton
        rows={10}
        columns={[
          { label: t('stock.colMedicine'), bar: 'w-40' },
          { label: t('stock.colStock'), className: 'w-[46%] sm:w-[34%]', bar: 'w-full' },
          { label: t('stock.colExpiry'), className: 'hidden sm:table-cell', bar: 'w-28' },
        ]}
      />
    </div>
  );
}

/** Pembelian: this month's total, the button, and the invoice rows. */
export function InventoryPurchasesSkeleton() {
  const t = useTranslations('inventory');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonLine className="w-96" />
        <SkeletonAction icon={<PlusIcon />}>{t('purchases.record')}</SkeletonAction>
      </div>
      <ul className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        {placeholders(6).map((key) => (
          <li
            key={key}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 last:border-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_8rem_6rem_8rem_1rem]">
            <Skeleton className="size-9 rounded-lg" />
            <span className="min-w-0">
              <SkeletonLine className="w-40" />
              <SkeletonLine size="xs" className="w-28" />
            </span>
            <span className="hidden sm:block">
              <SkeletonLine className="w-24" />
            </span>
            <span className="hidden sm:block">
              <Skeleton className="h-5 w-14 rounded-md" />
            </span>
            <span className="flex justify-end">
              <SkeletonLine className="w-24" />
            </span>
            <span className="hidden sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stok opname: the explanation, the button, and the past counts. */
export function InventoryOpnamesSkeleton() {
  const t = useTranslations('inventory.opnames');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
        <SkeletonAction icon={<PlusIcon />}>{t('start')}</SkeletonAction>
      </div>
      <TableSkeleton
        rows={5}
        columns={[
          { label: t('colTime'), bar: 'w-36' },
          { label: t('colBy'), bar: 'w-28' },
          { label: t('colCounted'), className: 'text-right', bar: 'w-8' },
          { label: t('colDifference'), className: 'text-right', bar: 'w-20' },
          { label: t('colNote'), bar: 'w-40' },
        ]}
      />
    </div>
  );
}

type BackLinkProps = {
  href: string;
  label: string;
};

function BackLink(props: BackLinkProps) {
  return (
    <Link
      href={props.href}
      className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      <ChevronLeftIcon className="size-4" aria-hidden />
      {props.label}
    </Link>
  );
}

/** The title block of a detail page: tile, name, and its tags. */
function DetailTitleSkeleton(props: { tags: string[]; tile?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className={cn('size-11 rounded-xl', props.tile)} />
      <div className="flex flex-col gap-1">
        <span className="flex h-6.5 items-center">
          <Skeleton className="h-4.5 w-48 rounded" />
        </span>
        <div className="flex flex-wrap gap-1.5">
          {props.tags.map((width) => (
            <Skeleton key={width} className={cn('h-6 rounded-md', width)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** One purchase invoice: supplier, total, and its batch lines. */
export function InventoryPurchaseSkeleton() {
  const t = useTranslations('inventory.purchase');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <BackLink href="/inventory/purchases" label={t('all')} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DetailTitleSkeleton tags={['w-28', 'w-24', 'w-52']} />
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">{t('total')}</span>
            <SkeletonLine size="numeral-3xl" className="w-36" />
          </div>
        </div>
      </div>
      <TableSkeleton
        rows={5}
        columns={[
          { label: t('colMedicine'), bar: 'w-40' },
          { label: t('colBatch'), bar: 'w-20' },
          { label: t('colExpiry'), bar: 'w-24' },
          { label: t('colQty'), className: 'text-right', bar: 'w-12' },
          { label: t('colCost'), className: 'text-right', bar: 'w-20' },
          { label: t('colSubtotal'), className: 'text-right', bar: 'w-24' },
        ]}
      />
    </div>
  );
}

/** One finished stock count: title line, and the counted batches. */
export function InventoryOpnameSkeleton() {
  const t = useTranslations('inventory.opname');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="flex h-7 items-center">
          <Skeleton className="h-4.5 w-56 rounded" />
        </span>
        <SkeletonLine className="w-64" />
      </div>
      <TableSkeleton
        rows={6}
        columns={[
          { label: t('colMedicine'), bar: 'w-40' },
          { label: t('colBatch'), bar: 'w-20' },
          { label: t('colSystem'), className: 'text-right', bar: 'w-10' },
          { label: t('colCounted'), className: 'text-right', bar: 'w-10' },
          { label: t('colDifference'), className: 'text-right', bar: 'w-10' },
          { label: t('colReason'), bar: 'w-36' },
        ]}
      />
    </div>
  );
}

/** A medicine's stock card: current stock beside the movement history. */
export function InventoryStockCardSkeleton() {
  const t = useTranslations('inventory.card');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/inventory" label={t('allMedicines')} />
        <DetailTitleSkeleton tags={['w-24', 'w-24', 'w-20']} tile="bg-status-pharmacy-soft" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h3 className="text-sm font-semibold">{t('stockNow')}</h3>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-col gap-3 border-b p-4">
              <span className="flex h-8 items-center">
                <Skeleton className="h-7 w-24 rounded" />
              </span>
              <div className="h-2 rounded-full bg-muted" />
              <SkeletonLine size="xs" className="w-64" />
            </div>
            <dl className="grid grid-cols-2 gap-px border-b bg-border">
              {[t('value'), t('nearest')].map((label) => (
                <div key={label} className="flex flex-col gap-0.5 bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <SkeletonLine className="w-20" />
                </div>
              ))}
            </dl>
            <ul className="flex flex-col">
              {placeholders(3).map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-0">
                  <SkeletonLine className="w-28" />
                  <SkeletonLine className="w-12" />
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className="flex min-w-0 flex-col gap-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {t('title')}
            <Skeleton className="h-5 w-6 rounded-md" />
          </h3>
          <ul className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            {placeholders(8).map((key) => (
              <li key={key} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <SkeletonLine className="w-28" />
                  <SkeletonLine size="xs" className="w-64" />
                </span>
                <SkeletonLine className="w-12" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

type FieldSkeletonProps = {
  label: string;
  hint?: string;
  className?: string;
};

/** A form field (FormField): the real label, the control still loading, and its hint. */
export function FieldSkeleton(props: FieldSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', props.className)}>
      <Label>{props.label}</Label>
      <InputFrame />
      {props.hint && <p className="text-xs text-muted-foreground first-letter:uppercase">{props.hint}</p>}
    </div>
  );
}

/** Catat pembelian: invoice fields, the batch lines, and the total. */
export function InventoryPurchaseFormSkeleton() {
  const t = useTranslations('inventory');
  const tc = useTranslations('common');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <FieldSkeleton label={t('purchaseForm.supplier')} />
        <FieldSkeleton label={t('purchaseForm.invoiceNo')} hint={tc('optional')} />
        <FieldSkeleton label={t('purchaseForm.date')} />
      </div>
      <TableSkeleton
        rows={1}
        columns={[
          { label: t('purchase.colMedicine'), className: 'min-w-56', bar: 'w-full' },
          { label: t('purchase.colBatch'), className: 'min-w-28', bar: 'w-full' },
          { label: t('purchase.colExpiry'), className: 'min-w-36', bar: 'w-full' },
          { label: t('purchase.colQty'), className: 'min-w-20', bar: 'w-full' },
          { label: t('purchase.colCost'), className: 'min-w-28', bar: 'w-full' },
          { label: t('purchase.colSubtotal'), className: 'text-right', bar: 'w-16' },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SkeletonButton className="w-32" />
        <SkeletonLine size="base" className="w-28" />
      </div>
      <FieldSkeleton label={t('purchaseForm.note')} hint={tc('optional')} className="max-w-3xl" />
    </div>
  );
}

/** Stok opname baru: the filter and every batch with stock. */
export function InventoryOpnameFormSkeleton() {
  const t = useTranslations('inventory');

  return (
    <div className="flex flex-col gap-4">
      <InputFrame className="max-w-sm" />
      <TableSkeleton
        rows={10}
        columns={[
          { label: t('opname.colMedicine'), bar: 'w-40' },
          { label: t('opname.colBatch'), bar: 'w-20' },
          { label: t('purchase.colExpiry'), bar: 'w-24' },
          { label: t('opname.colSystem'), className: 'text-right', bar: 'w-10' },
          { label: t('opname.colCounted'), className: 'w-24', bar: 'w-full' },
          { label: t('opname.colDifference'), bar: 'w-10' },
          { label: t('opname.colReason'), className: 'min-w-48', bar: 'w-full' },
        ]}
      />
    </div>
  );
}

/** An empty input box (the Input frame): a field that is still loading reads as a field, not a grey bar. */
export function InputFrame(props: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block h-9 w-full rounded-lg border border-input bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] pointer-coarse:h-10',
        props.className,
      )}
    />
  );
}
