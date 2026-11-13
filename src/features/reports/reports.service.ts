import "server-only";
import { countStockAlerts } from "@/features/inventory/inventory.service";
import { nearExpiryCutoff } from "@/features/inventory/inventory.lib";
import type { SupabaseClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import { listExpenses } from "@/features/expenses/expenses.service";
import { PAYMENT_METHOD_LABELS } from "@/features/billing/billing.constants";
import { ROLE_LABELS } from "@/features/auth/auth.constants";
import type { Role } from "@/lib/auth";
import { EXPORT_REPORTS, type DateRange, type ExportReport } from "./reports.lib";

const args = (range: DateRange) => ({ p_from: range.from, p_to: range.to });

function unwrapRows<T>(result: { data: T[] | null; error: { code?: string } | null }, name: string) {
  if (result.error) throw new Error(`${name} failed: ${result.error.code}`);
  return result.data ?? [];
}

export async function getRevenueReport(supabase: SupabaseClient, range: DateRange) {
  const [daily, byPoli, byMethod] = await Promise.all([
    supabase.rpc("report_revenue_daily", args(range)),
    supabase.rpc("report_revenue_by_poli", args(range)),
    supabase.rpc("report_revenue_by_method", args(range)),
  ]);
  const days = unwrapRows(daily, "report_revenue_daily");
  return {
    daily: days,
    byPoli: unwrapRows(byPoli, "report_revenue_by_poli"),
    byMethod: unwrapRows(byMethod, "report_revenue_by_method"),
    totals: days.reduce(
      (sum, day) => ({
        invoices: sum.invoices + day.invoices,
        gross: sum.gross + day.gross,
        discounts: sum.discounts + day.discounts,
        revenue: sum.revenue + day.revenue,
        bpjsVisits: sum.bpjsVisits + day.bpjs_visits,
        bpjsBilled: sum.bpjsBilled + day.bpjs_billed,
      }),
      { invoices: 0, gross: 0, discounts: 0, revenue: 0, bpjsVisits: 0, bpjsBilled: 0 },
    ),
  };
}

export async function getDoctorFees(supabase: SupabaseClient, range: DateRange) {
  return unwrapRows(await supabase.rpc("report_doctor_fees", args(range)), "report_doctor_fees");
}

export async function getProfitLoss(supabase: SupabaseClient, range: DateRange) {
  const rows = unwrapRows(await supabase.rpc("report_profit_loss", args(range)), "report_profit_loss");
  return rows[0] ?? { revenue: 0, medicine_cost: 0, expenses: 0, profit: 0 };
}

/** Today at a glance for the owner. */
export async function getOwnerDashboard(supabase: SupabaseClient, today: string) {
  const [revenue, visits, alerts] = await Promise.all([
    supabase.rpc("report_revenue_daily", { p_from: today, p_to: today }),
    supabase.from("visits").select("status, payer_type").eq("visit_date", today),
    countStockAlerts(supabase, nearExpiryCutoff(today)),
  ]);
  const todayRevenue = unwrapRows(revenue, "report_revenue_daily")[0];
  if (visits.error) throw new Error(`getOwnerDashboard visits failed: ${visits.error.code}`);

  const byStatus = new Map<string, number>();
  for (const visit of visits.data) byStatus.set(visit.status, (byStatus.get(visit.status) ?? 0) + 1);
  const active = visits.data.filter((visit) => visit.status !== "cancelled");

  return {
    revenue: todayRevenue?.revenue ?? 0,
    paidInvoices: todayRevenue?.invoices ?? 0,
    patients: active.length,
    bpjsPatients: active.filter((visit) => visit.payer_type === "bpjs").length,
    byStatus,
    alerts,
  };
}

export async function getVisitReport(supabase: SupabaseClient, range: DateRange) {
  return unwrapRows(await supabase.rpc("report_visits", args(range)), "report_visits");
}

export async function getTopDiseases(supabase: SupabaseClient, range: DateRange) {
  return unwrapRows(await supabase.rpc("report_top_diseases", args(range)), "report_top_diseases");
}

// Excel export --------------------------------------------------------------------

type Column = { header: string; key: string; width: number; kind?: "rupiah" | "number" | "text" };
type Sheet = { name: string; columns: Column[]; rows: Record<string, string | number | null>[] };

const RUPIAH_FORMAT = '"Rp" #,##0';

/** One workbook per report; numbers stay numbers (rupiah formatted) so they can be summed in Excel. */
export async function buildReportWorkbook(supabase: SupabaseClient, report: ExportReport, range: DateRange) {
  const sheets = await reportSheets(supabase, report, range);
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRow([`${EXPORT_REPORTS[report]} · ${range.from} s/d ${range.to}`]).font = { bold: true };
    worksheet.addRow([]);
    const header = worksheet.addRow(sheet.columns.map((column) => column.header));
    header.font = { bold: true };
    sheet.columns.forEach((column, index) => {
      const excelColumn = worksheet.getColumn(index + 1);
      excelColumn.width = column.width;
      if (column.kind === "rupiah") excelColumn.numFmt = RUPIAH_FORMAT;
    });
    for (const row of sheet.rows) worksheet.addRow(sheet.columns.map((column) => row[column.key] ?? ""));
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function reportSheets(supabase: SupabaseClient, report: ExportReport, range: DateRange): Promise<Sheet[]> {
  switch (report) {
    case "revenue": {
      const data = await getRevenueReport(supabase, range);
      return [
        {
          name: "Per hari",
          columns: [
            { header: "Tanggal", key: "day", width: 14 },
            { header: "Tagihan", key: "invoices", width: 10, kind: "number" },
            { header: "Bruto", key: "gross", width: 16, kind: "rupiah" },
            { header: "Diskon", key: "discounts", width: 16, kind: "rupiah" },
            { header: "Pendapatan", key: "revenue", width: 16, kind: "rupiah" },
            { header: "Kunjungan BPJS", key: "bpjs_visits", width: 16, kind: "number" },
            { header: "Nilai layanan BPJS", key: "bpjs_billed", width: 20, kind: "rupiah" },
          ],
          rows: data.daily,
        },
        {
          name: "Per poli",
          columns: [
            { header: "Poli", key: "poli_name", width: 24 },
            { header: "Tagihan", key: "invoices", width: 10, kind: "number" },
            { header: "Pendapatan", key: "revenue", width: 16, kind: "rupiah" },
            { header: "Kunjungan BPJS", key: "bpjs_visits", width: 16, kind: "number" },
          ],
          rows: data.byPoli,
        },
        {
          name: "Per metode",
          columns: [
            { header: "Metode", key: "method", width: 14 },
            { header: "Transaksi", key: "payments", width: 12, kind: "number" },
            { header: "Jumlah", key: "amount", width: 16, kind: "rupiah" },
          ],
          rows: data.byMethod.map((row) => ({
            ...row,
            method: PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS] ?? row.method,
          })),
        },
      ];
    }
    case "doctor-fees":
      return [
        {
          name: "Jasa medis",
          columns: [
            { header: "Nama", key: "recipient_name", width: 28 },
            { header: "Peran", key: "role", width: 12 },
            { header: "Layanan", key: "lines", width: 10, kind: "number" },
            { header: "Nilai layanan", key: "billed", width: 16, kind: "rupiah" },
            { header: "Jasa medis", key: "fee", width: 16, kind: "rupiah" },
          ],
          rows: (await getDoctorFees(supabase, range)).map((row) => ({
            ...row,
            role: ROLE_LABELS[row.recipient_role as Role] ?? row.recipient_role,
          })),
        },
      ];
    case "profit-loss": {
      const pl = await getProfitLoss(supabase, range);
      return [
        {
          name: "Laba rugi",
          columns: [
            { header: "Pos", key: "label", width: 28 },
            { header: "Jumlah", key: "amount", width: 18, kind: "rupiah" },
          ],
          rows: [
            { label: "Pendapatan (umum)", amount: pl.revenue },
            { label: "Harga pokok obat", amount: -pl.medicine_cost },
            { label: "Pengeluaran operasional", amount: -pl.expenses },
            { label: "Laba bersih", amount: pl.profit },
          ],
        },
      ];
    }
    case "visits":
      return [
        {
          name: "Kunjungan",
          columns: [
            { header: "Poli", key: "poli_name", width: 22 },
            { header: "Dokter", key: "doctor_name", width: 28 },
            { header: "Kunjungan", key: "visits", width: 12, kind: "number" },
            { header: "Baru", key: "new_patients", width: 10, kind: "number" },
            { header: "Lama", key: "returning_patients", width: 10, kind: "number" },
          ],
          rows: await getVisitReport(supabase, range),
        },
      ];
    case "top-diseases":
      return [
        {
          name: "10 besar penyakit",
          columns: [
            { header: "Kode ICD-10", key: "icd10_code", width: 12 },
            { header: "Penyakit", key: "name", width: 48 },
            { header: "Kasus", key: "cases", width: 10, kind: "number" },
          ],
          rows: await getTopDiseases(supabase, range),
        },
      ];
    case "expenses":
      return [
        {
          name: "Pengeluaran",
          columns: [
            { header: "Tanggal", key: "expense_date", width: 14 },
            { header: "Kategori", key: "category", width: 18 },
            { header: "Keterangan", key: "description", width: 36 },
            { header: "Jumlah", key: "amount", width: 16, kind: "rupiah" },
            { header: "Status", key: "status", width: 10 },
            { header: "Alasan batal", key: "void_reason", width: 28 },
          ],
          rows: (await listExpenses(supabase, range)).map((row) => ({
            expense_date: row.expense_date,
            category: row.category,
            description: row.description,
            amount: row.amount,
            status: row.status === "void" ? "Batal" : "Aktif",
            void_reason: row.void_reason,
          })),
        },
      ];
  }
}
