import { useTranslations } from 'next-intl';
import { placeholders, Skeleton, SkeletonLine } from '@/components/ui/skeleton';

/** Catatan pengeluaran while it loads: a day group of expense rows. */
export function ExpensesListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2">
          <SkeletonLine size="xs" className="w-36" />
          <SkeletonLine size="xs" className="w-20" />
        </header>
        <ul>
          {placeholders(4).map((key) => (
            <li key={key} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <SkeletonLine className="w-48" />
                <SkeletonLine size="xs" className="w-32" />
              </span>
              <SkeletonLine className="w-20" />
              <span className="hidden w-20 sm:block" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Per kategori while it loads. */
export function ExpensesCategoriesSkeleton() {
  const t = useTranslations('expenses');

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        {t('byCategory')}
        <SkeletonLine size="xs" className="w-24" />
      </h2>
      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <div className="px-4 pt-4">
          <div className="h-2.5 rounded-full bg-muted" />
        </div>
        <ul className="flex flex-col gap-3.5 p-4">
          {placeholders(3).map((key) => (
            <li key={key} className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between gap-3">
                <SkeletonLine className="w-28" />
                <SkeletonLine className="w-20" />
              </span>
              <span className="h-1.5 rounded-full bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
