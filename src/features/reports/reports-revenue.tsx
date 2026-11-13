import { BanknoteIcon, ChevronRightIcon, LandmarkIcon, QrCodeIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PAYMENT_METHOD_LABELS } from '@/features/billing/billing.constants';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { getRevenueReport } from './reports.service';
import { ReportsBarChart } from './reports-bar-chart';
import { ReportsKpis } from './reports-kpis';
import { ReportsSection } from './reports-section';

type ReportsRevenueProps = {
  report: Awaited<ReturnType<typeof getRevenueReport>>;
  /** Every day of the period, for the chart. */
  days: string[];
  /** Print view: the daily table is shown open. */
  print?: boolean;
};

const METHOD_STYLE: Record<string, { tone: string; icon: typeof BanknoteIcon }> = {
  cash: { tone: 'bg-primary', icon: BanknoteIcon },
  qris: { tone: 'bg-[#7a5bd1]', icon: QrCodeIcon },
  transfer: { tone: 'bg-[#3a7bd5]', icon: LandmarkIcon },
};

const share = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Money in: how much, when, from which poli, by which method. */
export function ReportsRevenue(props: ReportsRevenueProps) {
  const { daily, byPoli, byMethod, totals } = props.report;
  const byDay = new Map(daily.map((day) => [day.day, day.revenue]));
  const series = props.days.map((day) => ({ day, value: byDay.get(day) ?? 0 }));
  const poliRows = [...byPoli].sort((a, b) => b.revenue - a.revenue);
  const topPoli = Math.max(1, ...poliRows.map((row) => row.revenue));
  const methodTotal = byMethod.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <ReportsKpis
        items={[
          { label: 'Pendapatan (umum)', value: formatRupiah(totals.revenue), hint: 'Tagihan umum yang lunas' },
          {
            label: 'Tagihan lunas',
            value: String(totals.invoices),
            hint: `Rata-rata ${totals.invoices > 0 ? formatRupiah(Math.round(totals.revenue / totals.invoices)) : '–'}`,
          },
          {
            label: 'Diskon',
            value: formatRupiah(totals.discounts),
            hint: `${share(totals.discounts, totals.gross)}% dari bruto ${formatRupiah(totals.gross)}`,
          },
          {
            label: 'Kunjungan BPJS',
            value: String(totals.bpjsVisits),
            hint: `Nilai layanan ${formatRupiah(totals.bpjsBilled)}`,
          },
        ]}
      />

      <ReportsSection title="Pendapatan per hari">
        <div className="p-4">
          <ReportsBarChart series={series} unit="rupiah" label="Pendapatan per hari" />
        </div>
      </ReportsSection>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportsSection title="Per poli">
          {poliRows.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-col gap-4 p-4">
              {poliRows.map((row) => (
                <li key={row.poli_name} className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{row.poli_name}</span>
                    <span className="tabular font-semibold">{formatRupiah(row.revenue)}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/70"
                      style={{ width: `${(row.revenue / topPoli) * 100}%` }}
                    />
                  </span>
                  <span className="tabular text-xs text-muted-foreground">
                    {share(row.revenue, totals.revenue)}% · {row.invoices} tagihan · {row.bpjs_visits} BPJS
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReportsSection>

        <ReportsSection title="Per metode pembayaran">
          {byMethod.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                {byMethod.map((row) => (
                  <span
                    key={row.method}
                    className={METHOD_STYLE[row.method]?.tone ?? 'bg-muted-foreground'}
                    style={{ width: `${share(row.amount, methodTotal)}%` }}
                  />
                ))}
              </div>
              <ul className="flex flex-col gap-3">
                {byMethod.map((row) => {
                  const style = METHOD_STYLE[row.method];
                  const Icon = style?.icon ?? BanknoteIcon;

                  return (
                    <li key={row.method} className="flex items-center gap-3 text-sm">
                      <span className={cn('size-2.5 rounded-sm', style?.tone ?? 'bg-muted-foreground')} aria-hidden />
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      <span className="flex-1 font-medium">
                        {PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS] ?? row.method}
                      </span>
                      <span className="tabular text-xs text-muted-foreground">
                        {row.payments}× · {share(row.amount, methodTotal)}%
                      </span>
                      <span className="tabular w-28 text-right font-semibold">{formatRupiah(row.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </ReportsSection>
      </div>

      {daily.length > 0 && (
        <details open={props.print} className="group rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
            <ChevronRightIcon
              className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
              aria-hidden
            />
            Rincian per hari
            <span className="text-xs font-normal text-muted-foreground">untuk pembukuan, sama dengan ekspor Excel</span>
          </summary>
          <div className="border-t p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Diskon</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">BPJS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((day) => (
                  <TableRow key={day.day}>
                    <TableCell>{formatDate(day.day)}</TableCell>
                    <TableCell className="tabular text-right">{day.invoices}</TableCell>
                    <TableCell className="tabular text-right">{formatRupiah(day.gross)}</TableCell>
                    <TableCell className="tabular text-right">{formatRupiah(day.discounts)}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{formatRupiah(day.revenue)}</TableCell>
                    <TableCell className="tabular text-right">{day.bpjs_visits}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
    </div>
  );
}

function Empty() {
  return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Tidak ada data pada periode ini.</p>;
}
