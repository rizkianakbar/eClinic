import { ReceiptTextIcon } from 'lucide-react';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import { expenseStyle } from './expenses.constants';
import { expenseSummary } from './expenses.lib';
import type { listExpenses } from './expenses.service';
import { ExpensesVoidDialog } from './expenses-void-dialog';

type ExpensesProps = {
  expenses: Awaited<ReturnType<typeof listExpenses>>;
  /** Print view: no actions. */
  readOnly?: boolean;
};

const dayFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Entries grouped by day, each day with its subtotal; cancelled entries stay visible, struck through. */
export function Expenses(props: ExpensesProps) {
  if (props.expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-6 py-12 text-center">
        <ReceiptTextIcon className="mb-1 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Tidak ada pengeluaran pada periode ini</p>
        <p className="text-[0.8125rem] text-muted-foreground">
          Catat gaji, listrik, sewa, dan biaya lain agar laporan laba rugi akurat.
        </p>
      </div>
    );
  }

  const summary = expenseSummary(props.expenses);

  return (
    <div className="flex flex-col gap-4">
      {summary.byDay.map((day) => (
        <section
          key={day.day}
          className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground">{dayFormat.format(new Date(day.day))}</h3>
            <span className="tabular text-xs font-semibold">{formatRupiah(day.total)}</span>
          </header>
          <ul>
            {day.items.map((item) => {
              const voided = item.status === 'void';
              const style = expenseStyle(item.category);

              return (
                <li
                  key={item.id}
                  className={cn('flex items-center gap-3 border-b px-4 py-3 last:border-0', voided && 'bg-muted/30')}>
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      voided ? 'bg-muted text-muted-foreground' : style.tone,
                    )}>
                    <style.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm font-medium',
                        voided && 'text-muted-foreground line-through',
                      )}>
                      {item.category}
                      {item.description && (
                        <span className="font-normal text-muted-foreground"> · {item.description}</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {voided ? (
                        <span className="text-status-cancelled">Dibatalkan: {item.void_reason}</span>
                      ) : (
                        <>Dicatat {item.creator?.full_name ?? 'staf'}</>
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'tabular text-right text-sm font-semibold',
                      voided && 'font-normal text-muted-foreground line-through',
                    )}>
                    {formatRupiah(item.amount)}
                  </span>
                  {!props.readOnly && (
                    <span className="w-20 text-right">
                      {voided ? (
                        <span className="rounded-md bg-muted px-1.5 text-xs leading-5 text-muted-foreground">
                          Batal
                        </span>
                      ) : (
                        <ExpensesVoidDialog
                          expenseId={item.id}
                          label={`${item.category} ${formatRupiah(item.amount)}`}
                        />
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
