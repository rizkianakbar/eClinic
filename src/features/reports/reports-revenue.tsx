import { BanknoteIcon, ChevronRightIcon, LandmarkIcon, QrCodeIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PAYMENT_METHODS } from '@/features/billing/billing.lib';
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

const isMethod = (method: string): method is (typeof PAYMENT_METHODS)[number] =>
  (PAYMENT_METHODS as readonly string[]).includes(method);

const share = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Money in: how much, when, from which poli, by which method. */
export function ReportsRevenue(props: ReportsRevenueProps) {
  const t = useTranslations('reports.revenue');
  const tm = useTranslations('paymentMethod');
  const locale = useLocale();
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
          { label: t('kpiRevenue'), value: formatRupiah(totals.revenue), hint: t('kpiRevenueHint') },
          {
            label: t('kpiInvoices'),
            value: String(totals.invoices),
            hint: t('kpiAverage', {
              amount: totals.invoices > 0 ? formatRupiah(Math.round(totals.revenue / totals.invoices)) : '–',
            }),
          },
          {
            label: t('kpiDiscounts'),
            value: formatRupiah(totals.discounts),
            hint: t('kpiDiscountsHint', {
              share: share(totals.discounts, totals.gross),
              gross: formatRupiah(totals.gross),
            }),
          },
          {
            label: t('kpiBpjs'),
            value: String(totals.bpjsVisits),
            hint: t('kpiBpjsHint', { amount: formatRupiah(totals.bpjsBilled) }),
          },
        ]}
      />

      <ReportsSection title={t('perDay')}>
        <div className="p-4">
          <ReportsBarChart series={series} unit="rupiah" label={t('perDay')} />
        </div>
      </ReportsSection>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportsSection title={t('perPoli')}>
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
                    {t('poliLine', {
                      share: share(row.revenue, totals.revenue),
                      invoices: row.invoices,
                      bpjs: row.bpjs_visits,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReportsSection>

        <ReportsSection title={t('perMethod')}>
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
                      <span className="flex-1 font-medium">{isMethod(row.method) ? tm(row.method) : row.method}</span>
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
        <details
          open={props.print}
          className="disclose group rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
            <ChevronRightIcon
              className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
              aria-hidden
            />
            {t('daily')}
            <span className="text-xs font-normal text-muted-foreground">{t('dailyHint')}</span>
          </summary>
          <div className="border-t p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colDate')}</TableHead>
                  <TableHead className="text-right">{t('colInvoices')}</TableHead>
                  <TableHead className="text-right">{t('colGross')}</TableHead>
                  <TableHead className="text-right">{t('colDiscounts')}</TableHead>
                  <TableHead className="text-right">{t('colRevenue')}</TableHead>
                  <TableHead className="text-right">{t('colBpjs')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((day) => (
                  <TableRow key={day.day}>
                    <TableCell>{formatDate(day.day, locale)}</TableCell>
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
  const t = useTranslations('reports');

  return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('noData')}</p>;
}
