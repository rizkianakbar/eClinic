import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { expenseStyle } from "./expenses.constants";
import type { expenseSummary } from "./expenses.lib";

type ExpensesCategoriesProps = {
  summary: ReturnType<typeof expenseSummary>;
};

/** Where the money went: categories ranked, with their share of the period's total. */
export function ExpensesCategories(props: ExpensesCategoriesProps) {
  const { summary } = props;
  const top = Math.max(1, summary.byCategory[0]?.total ?? 0);

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        Per kategori
        <span className="tabular text-xs font-medium text-muted-foreground">Total {formatRupiah(summary.total)}</span>
      </h2>
      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        {summary.byCategory.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada pengeluaran.</p>
        ) : (
          <>
            <div className="px-4 pt-4" aria-hidden>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                {summary.byCategory.map((row) => (
                  <span
                    key={row.category}
                    className={expenseStyle(row.category).bar}
                    style={{ width: `${(row.total / Math.max(1, summary.total)) * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <ul className="flex flex-col gap-3.5 p-4">
              {summary.byCategory.map((row) => {
                const style = expenseStyle(row.category);
                return (
                  <li key={row.category} className="flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", style.tone)}>
                        <style.icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="flex-1 font-medium">{row.category}</span>
                      <span className="tabular font-semibold">{formatRupiah(row.total)}</span>
                    </span>
                    <span className="flex items-center gap-2 pl-8">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span className={cn("block h-full rounded-full", style.bar)} style={{ width: `${(row.total / top) * 100}%` }} />
                      </span>
                      <span className="tabular w-24 text-right text-xs text-muted-foreground">
                        {Math.round((row.total / Math.max(1, summary.total)) * 100)}% · {row.count}×
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
