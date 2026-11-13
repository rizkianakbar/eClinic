import { ChevronLeftIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
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
import { STOCK_FILTER_LABELS } from './inventory.constants';
import { InventorySearchSkeleton } from './inventory-search';

/** The stock summary beside the Stok obat title (it streams in on its own). */
export function InventorySummarySkeleton() {
  return (
    <SkeletonStats
      items={[
        { label: 'Obat aktif', hint: 'jenis' },
        { label: 'Nilai stok', hint: 'harga beli' },
        { label: 'Perlu dipesan', hint: 'di bawah minimum' },
        { label: 'Hampir kedaluwarsa', hint: '≤ 3 bulan' },
      ]}
    />
  );
}

/** Stok: filter, search, and the stock rows (name, level bar, nearest expiry). */
export function InventoryStockSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedSkeleton options={Object.values(STOCK_FILTER_LABELS)} />
        <InventorySearchSkeleton placeholder="Cari nama obat" />
      </div>
      <TableSkeleton
        rows={10}
        columns={[
          { label: 'Obat', bar: 'w-40' },
          { label: 'Stok', className: 'w-[46%] sm:w-[34%]', bar: 'w-full' },
          { label: 'Kedaluwarsa terdekat', className: 'hidden sm:table-cell', bar: 'w-28' },
        ]}
      />
    </div>
  );
}

/** Pembelian: this month's total, the button, and the invoice rows. */
export function InventoryPurchasesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonLine className="w-96" />
        <SkeletonAction icon={<PlusIcon />}>Catat pembelian</SkeletonAction>
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Hitung stok fisik; selisih langsung menyesuaikan stok dan tercatat di kartu stok.
        </p>
        <SkeletonAction icon={<PlusIcon />}>Mulai stok opname</SkeletonAction>
      </div>
      <TableSkeleton
        rows={5}
        columns={[
          { label: 'Waktu', bar: 'w-36' },
          { label: 'Oleh', bar: 'w-28' },
          { label: 'Batch dihitung', className: 'text-right', bar: 'w-8' },
          { label: 'Selisih', className: 'text-right', bar: 'w-20' },
          { label: 'Catatan', bar: 'w-40' },
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
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <BackLink href="/inventory/purchases" label="Semua pembelian" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DetailTitleSkeleton tags={['w-28', 'w-24', 'w-52']} />
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Total faktur</span>
            <SkeletonLine size="numeral-3xl" className="w-36" />
          </div>
        </div>
      </div>
      <TableSkeleton
        rows={5}
        columns={[
          { label: 'Obat', bar: 'w-40' },
          { label: 'No. batch', bar: 'w-20' },
          { label: 'Kedaluwarsa', bar: 'w-24' },
          { label: 'Jumlah', className: 'text-right', bar: 'w-12' },
          { label: 'Harga beli', className: 'text-right', bar: 'w-20' },
          { label: 'Subtotal', className: 'text-right', bar: 'w-24' },
        ]}
      />
    </div>
  );
}

/** One finished stock count: title line, and the counted batches. */
export function InventoryOpnameSkeleton() {
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
          { label: 'Obat', bar: 'w-40' },
          { label: 'Batch', bar: 'w-20' },
          { label: 'Sistem', className: 'text-right', bar: 'w-10' },
          { label: 'Fisik', className: 'text-right', bar: 'w-10' },
          { label: 'Selisih', className: 'text-right', bar: 'w-10' },
          { label: 'Alasan', bar: 'w-36' },
        ]}
      />
    </div>
  );
}

/** A medicine's stock card: current stock beside the movement history. */
export function InventoryStockCardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/inventory" label="Semua obat" />
        <DetailTitleSkeleton tags={['w-24', 'w-24', 'w-20']} tile="bg-status-pharmacy-soft" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h3 className="text-sm font-semibold">Stok sekarang</h3>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-col gap-3 border-b p-4">
              <span className="flex h-8 items-center">
                <Skeleton className="h-7 w-24 rounded" />
              </span>
              <div className="h-2 rounded-full bg-muted" />
              <SkeletonLine size="xs" className="w-64" />
            </div>
            <dl className="grid grid-cols-2 gap-px border-b bg-border">
              {['Nilai stok', 'Kedaluwarsa terdekat'].map((label) => (
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
            Kartu stok
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
  return (
    <div className="flex flex-col gap-6">
      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <FieldSkeleton label="Supplier" />
        <FieldSkeleton label="No. faktur" hint="opsional" />
        <FieldSkeleton label="Tanggal" />
      </div>
      <TableSkeleton
        rows={1}
        columns={[
          { label: 'Obat', className: 'min-w-56', bar: 'w-full' },
          { label: 'No. batch', className: 'min-w-28', bar: 'w-full' },
          { label: 'Kedaluwarsa', className: 'min-w-36', bar: 'w-full' },
          { label: 'Jumlah', className: 'min-w-20', bar: 'w-full' },
          { label: 'Harga beli', className: 'min-w-28', bar: 'w-full' },
          { label: 'Subtotal', className: 'text-right', bar: 'w-16' },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SkeletonButton className="w-32" />
        <SkeletonLine size="base" className="w-28" />
      </div>
      <FieldSkeleton label="Catatan" hint="opsional" className="max-w-3xl" />
    </div>
  );
}

/** Stok opname baru: the filter and every batch with stock. */
export function InventoryOpnameFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <InputFrame className="max-w-sm" />
      <TableSkeleton
        rows={10}
        columns={[
          { label: 'Obat', bar: 'w-40' },
          { label: 'Batch', bar: 'w-20' },
          { label: 'Kedaluwarsa', bar: 'w-24' },
          { label: 'Sistem', className: 'text-right', bar: 'w-10' },
          { label: 'Fisik', className: 'w-24', bar: 'w-full' },
          { label: 'Selisih', bar: 'w-10' },
          { label: 'Alasan', className: 'min-w-48', bar: 'w-full' },
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
