import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";
import { listExpenses } from "@/features/expenses/expenses.service";
import { expenseSummary } from "@/features/expenses/expenses.lib";
import { Expenses } from "@/features/expenses/expenses";
import { ExpensesCategories } from "@/features/expenses/expenses-categories";
import { getClinicProfile } from "@/features/settings/settings.service";
import { SettingsLetterhead } from "@/features/settings/settings-letterhead";
import { EXPORT_REPORTS, isExportReport, parseRange, rangeDays } from "@/features/reports/reports.lib";
import {
  getDoctorFees,
  getProfitLoss,
  getRevenueReport,
  getTopDiseases,
  getVisitReport,
} from "@/features/reports/reports.service";
import { ReportsDoctorFees } from "@/features/reports/reports-doctor-fees";
import { ReportsProfitLoss } from "@/features/reports/reports-profit-loss";
import { ReportsRevenue } from "@/features/reports/reports-revenue";
import { ReportsTopDiseases } from "@/features/reports/reports-top-diseases";
import { ReportsVisits } from "@/features/reports/reports-visits";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime, todayInJakarta } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cetak laporan" };

/** A4 print view of a report; the browser's "Save as PDF" makes the PDF. */
export default async function PrintReportPage(props: PageProps<"/print/report/[report]">) {
  await requireRole("owner");
  const { report } = await props.params;
  if (!isExportReport(report)) notFound();
  const range = parseRange(await props.searchParams, todayInJakarta());
  const supabase = await createClient();
  const clinic = await getClinicProfile(supabase);

  let body: React.ReactNode;
  switch (report) {
    case "revenue":
      body = <ReportsRevenue report={await getRevenueReport(supabase, range)} days={rangeDays(range)} print />;
      break;
    case "doctor-fees":
      body = <ReportsDoctorFees fees={await getDoctorFees(supabase, range)} />;
      break;
    case "profit-loss":
      body = <ReportsProfitLoss profitLoss={await getProfitLoss(supabase, range)} />;
      break;
    case "visits":
      body = <ReportsVisits rows={await getVisitReport(supabase, range)} days={rangeDays(range).length} />;
      break;
    case "top-diseases":
      body = <ReportsTopDiseases rows={await getTopDiseases(supabase, range)} />;
      break;
    case "expenses": {
      const expenses = await listExpenses(supabase, range);
      body = (
        <div className="flex flex-col gap-4">
          <ExpensesCategories summary={expenseSummary(expenses)} />
          <Expenses expenses={expenses} readOnly />
        </div>
      );
      break;
    }
  }

  return (
    <main className="mx-auto flex max-w-[210mm] flex-col gap-4 bg-white p-8 text-black print:p-0">
      <style>
        {"@page { size: A4; margin: 15mm; } @media print { body { background: white; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }"}
      </style>
      <div className="print:hidden">
        <PrintButton />
      </div>
      {clinic && <SettingsLetterhead clinic={clinic} />}
      <div>
        <h1 className="text-xl font-semibold">{EXPORT_REPORTS[report]}</h1>
        <p className="text-sm">
          Periode {formatDate(range.from)} – {formatDate(range.to)} · dicetak {formatDateTime(new Date())}
        </p>
      </div>
      {body}
    </main>
  );
}
