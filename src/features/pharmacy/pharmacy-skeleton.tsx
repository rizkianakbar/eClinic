import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { placeholders, Skeleton, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';

/** Menyiapkan resep for one visit: the patient card, the prescription lines, and the summary beside them. */
export function PharmacyDispenseSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pharmacy"
        className="-mb-2 -ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Resep masuk
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <div className="flex min-w-0 items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col">
            <span className="flex h-7 items-center">
              <Skeleton className="h-5 w-52 rounded" />
            </span>
            <span className="mt-0.5">
              <SkeletonLine className="w-80" />
            </span>
          </div>
        </div>
        <VisitsJourneyPosition status={null} className="w-full max-w-md" />
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="min-w-0 flex-1">
                <SkeletonLine className="w-20" />
                <SkeletonLine size="xs" className="w-44" />
              </div>
            </header>
            <ol className="divide-y">
              {placeholders(3).map((key) => (
                <li key={key} className="flex flex-col gap-3 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <SkeletonLine size="base" className="w-44" />
                        <SkeletonLine className="w-16" />
                      </div>
                      <Skeleton className="mt-1 h-6 w-36 rounded-md" />
                      <div className="mt-2">
                        <SkeletonLine className="w-64" />
                      </div>
                    </div>
                  </div>
                  <div className="pl-13">
                    <SkeletonButton size="sm" className="w-44" />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-19">
          <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <h2 className="mb-3 text-sm font-semibold">Ringkasan</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {['Diserahkan', 'Tidak diberikan'].map((label) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <SkeletonLine className="w-20" />
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t pt-3">
                <SkeletonLine className="w-36" />
                <SkeletonLine size="numeral-2xl" className="w-24" />
              </div>
            </dl>
            <SkeletonButton size="lg" className="mt-4 w-full" />
          </section>
          <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <h2 className="mb-3 text-sm font-semibold">Setelah diserahkan</h2>
            <ol className="flex flex-col gap-3">
              {placeholders(3).map((key) => (
                <li key={key} className="flex gap-2.5">
                  <Skeleton className="size-6 shrink-0 rounded-md" />
                  <span className="flex flex-1 flex-col">
                    <SkeletonLine className="w-full" />
                    <SkeletonLine className="w-2/3" />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
