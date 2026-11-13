import type { Metadata } from "next";
import { expenseSummary } from "@/features/expenses/expenses.lib";
import { listExpenses } from "@/features/expenses/expenses.service";
import { Expenses } from "@/features/expenses/expenses";
import { ExpensesCategories } from "@/features/expenses/expenses-categories";
import { ExpensesDialog } from "@/features/expenses/expenses-dialog";
import { parseRange, rangeDays } from "@/features/reports/reports.lib";
import { getProfitLoss } from "@/features/reports/reports.service";
import { ReportsExportLinks } from "@/features/reports/reports-export-links";
import { ReportsKpis } from "@/features/reports/reports-kpis";
import { ReportsRangeFilter } from "@/features/reports/reports-range-filter";
import { requireRole } from "@/lib/auth";
import { formatDate, todayInJakarta } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pengeluaran" };

export default async function ExpensesPage(props: PageProps<"/expenses">) {
  await requireRole("owner");
  const today = todayInJakarta();
  const range = parseRange(await props.searchParams, today);
  const supabase = await createClient();
  const [expenses, profitLoss] = await Promise.all([listExpenses(supabase, range), getProfitLoss(supabase, range)]);
  const summary = expenseSummary(expenses);
  const days = rangeDays(range).length;
  const biggest = summary.byCategory[0];
  const ratio = profitLoss.revenue > 0 ? Math.round((summary.total / profitLoss.revenue) * 100) : null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Pengeluaran</h1>
          <p className="text-sm text-muted-foreground">
            Biaya operasional klinik · {formatDate(range.from)} – {formatDate(range.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportsExportLinks report="expenses" range={range} />
          <ExpensesDialog today={today} />
        </div>
      </header>
      <ReportsRangeFilter range={range} today={today} />

      <ReportsKpis
        items={[
          { label: "Total pengeluaran", value: formatRupiah(summary.total), hint: `${summary.count} catatan${summary.voided ? ` · ${summary.voided} dibatalkan` : ""}` },
          { label: "Rata-rata per hari", value: formatRupiah(Math.round(summary.total / Math.max(1, days))), hint: `${days} hari` },
          { label: "Terbesar", value: biggest ? biggest.category : "–", hint: biggest ? formatRupiah(biggest.total) : "Belum ada" },
          {
            label: profitLoss.profit < 0 ? "Rugi bersih" : "Laba bersih",
            value: formatRupiah(profitLoss.profit),
            hint:
              ratio === null
                ? "Belum ada pendapatan pada periode ini"
                : `Pengeluaran = ${ratio}% dari pendapatan ${formatRupiah(profitLoss.revenue)}`,
            tone: profitLoss.profit < 0 ? "negative" : "positive",
          },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            Catatan pengeluaran
            <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">{expenses.length}</span>
          </h2>
          <Expenses expenses={expenses} />
        </section>
        <aside className="lg:sticky lg:top-20">
          <ExpensesCategories summary={summary} />
        </aside>
      </div>
    </>
  );
}
