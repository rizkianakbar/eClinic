import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { placeholders, Skeleton, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { METHODS } from '@/features/home/home-cashier';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { cn } from '@/lib/utils';

type VisitHeaderSkeletonProps = {
  back: { href: string; label: string };
};

/** The patient header of a visit page (cashier, visit summary): back link, avatar, name, tags, journey. */
export function VisitHeaderSkeleton(props: VisitHeaderSkeletonProps) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        href={props.back.href}
        className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        {props.back.label}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
        <div className="flex min-w-0 items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-2xl" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <SkeletonLine size="title" className="w-56" />
            <div className="flex flex-wrap items-center gap-1.5">
              {['w-24', 'w-20', 'w-40', 'w-14'].map((width) => (
                <Skeleton key={width} className={cn('h-6 rounded-md', width)} />
              ))}
            </div>
          </div>
        </div>
        <VisitsJourneyPosition status={null} className="w-full max-w-md" />
      </div>
    </header>
  );
}

/** Kasir for one visit: the invoice lines and totals, and the payment form beside them. */
export function BillingInvoiceSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <section className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Rincian tagihan
          <Skeleton className="h-5 w-6 rounded-md" />
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {[2, 2].map((rows, group) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder groups.
            <div key={group} className="border-b">
              <p className="flex items-center gap-2 bg-muted/40 px-4 py-2">
                <SkeletonLine size="xs" className="w-24" />
                <span className="ml-auto">
                  <SkeletonLine size="xs" className="w-16" />
                </span>
              </p>
              <ul>
                {placeholders(rows).map((key) => (
                  <li key={key} className="flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <SkeletonLine className="w-48" />
                      <SkeletonLine className="w-36" />
                    </div>
                    <SkeletonLine className="w-20" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <dl className="flex flex-col gap-1.5 px-4 py-3 text-sm">
            {['Subtotal', 'Diskon tagihan'].map((label) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <SkeletonLine className="w-20" />
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between gap-3 border-t bg-muted/30 px-4 py-4">
            <span className="text-sm font-semibold">Total tagihan</span>
            <SkeletonLine size="numeral-3xl" className="w-36" />
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">Pembayaran</h2>
        <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <div className="flex flex-col gap-2">
            <p className="mb-2 text-sm font-medium">Metode pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((method, index) => (
                <span
                  key={method.key}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[0.8125rem] font-medium text-muted-foreground',
                    index === 0 && 'border-primary bg-secondary/60 text-foreground shadow-[0_0_0_1px_var(--primary)]',
                  )}>
                  <method.icon className={cn('size-5', index === 0 && 'text-primary')} aria-hidden />
                  {method.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Uang diterima</span>
              <Skeleton className="h-11 rounded-lg" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['w-20', 'w-24', 'w-24'].map((width, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder buttons.
                <SkeletonButton key={index} size="xs" className={width} />
              ))}
            </div>
            <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2.5 text-muted-foreground">
              <span className="text-sm font-medium">Kembalian</span>
              <span className="numeral text-[1.375rem]">–</span>
            </div>
          </div>
          <SkeletonButton size="lg" className="w-full" />
        </div>
      </aside>
    </div>
  );
}
