import { ChevronRightIcon, PlusIcon, TruckIcon } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLinks } from '@/components/ui/page-links';
import { initials } from '@/features/patients/patients.lib';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { MEDICINES_PAGE_SIZE } from './inventory.lib';
import type { getPurchaseMonth, listPurchases } from './inventory.service';

type InventoryPurchasesProps = Awaited<ReturnType<typeof listPurchases>> & {
  page: number;
  month: Awaited<ReturnType<typeof getPurchaseMonth>>;
};

/** Every supplier invoice received; each one added batches (with purchase price) to stock. */
export function InventoryPurchases(props: InventoryPurchasesProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bulan ini <span className="tabular font-semibold text-foreground">{formatRupiah(props.month.total)}</span>{' '}
          dari <span className="tabular font-semibold text-foreground">{props.month.count}</span> faktur. Setiap
          pembelian menambah stok per batch.
        </p>
        <Link href="/inventory/purchases/new" className={buttonVariants()}>
          <PlusIcon />
          Catat pembelian
        </Link>
      </div>
      {props.purchases.length === 0 ? (
        <EmptyState
          icon={TruckIcon}
          title="Belum ada pembelian"
          description="Catat faktur dari supplier: obat, nomor batch, tanggal kedaluwarsa, dan harga belinya."
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {props.purchases.map((purchase) => (
            <li key={purchase.id} className="border-b last:border-0">
              <Link
                href={`/inventory/purchases/${purchase.id}`}
                className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/50 sm:grid-cols-[2.25rem_minmax(0,1fr)_8rem_6rem_8rem_1rem]">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initials(purchase.supplier?.name ?? '?')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{purchase.supplier?.name}</span>
                  <span className="tabular block text-xs text-muted-foreground">
                    Faktur {purchase.invoice_no ?? 'tanpa nomor'}
                  </span>
                </span>
                <span className="hidden text-sm text-muted-foreground sm:block">
                  {formatDate(purchase.purchase_date)}
                </span>
                <span className="hidden sm:block">
                  <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium">
                    {purchase.items[0]?.count ?? 0} obat
                  </span>
                </span>
                <span className="tabular text-right text-sm font-semibold">{formatRupiah(purchase.total)}</span>
                <ChevronRightIcon
                  className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PageLinks page={props.page} pageSize={MEDICINES_PAGE_SIZE} total={props.total} noun="pembelian" />
    </div>
  );
}
