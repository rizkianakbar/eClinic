import { InfoIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import { profitLossStatement } from './reports.lib';
import type { getProfitLoss } from './reports.service';
import { ReportsKpis } from './reports-kpis';

type ReportsProfitLossProps = {
  profitLoss: Awaited<ReturnType<typeof getProfitLoss>>;
};

type Line = { label: string; note: string; value: number; kind: 'income' | 'cost' | 'result' };

/** The income statement, top to bottom: what came in, what it cost, what is left. */
export function ReportsProfitLoss(props: ReportsProfitLossProps) {
  const statement = profitLossStatement(props.profitLoss);
  const loss = statement.net < 0;
  const scale = Math.max(1, statement.revenue, statement.medicineCost + statement.expenses);

  const lines: Line[] = [
    { label: 'Pendapatan', note: 'Tagihan pasien umum yang lunas', value: statement.revenue, kind: 'income' },
    {
      label: 'Harga pokok obat',
      note: 'Harga beli batch yang diserahkan (umum dan BPJS)',
      value: statement.medicineCost,
      kind: 'cost',
    },
    {
      label: 'Laba kotor',
      note: statement.grossMargin === null ? '' : `Margin ${statement.grossMargin}%`,
      value: statement.gross,
      kind: 'result',
    },
    {
      label: 'Pengeluaran operasional',
      note: 'Gaji, sewa, listrik, dan lainnya yang dicatat',
      value: statement.expenses,
      kind: 'cost',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ReportsKpis
        items={[
          { label: 'Pendapatan', value: formatRupiah(statement.revenue) },
          {
            label: 'Total biaya',
            value: formatRupiah(statement.medicineCost + statement.expenses),
            hint: 'Obat + operasional',
          },
          {
            label: loss ? 'Rugi bersih' : 'Laba bersih',
            value: formatRupiah(statement.net),
            hint: statement.netMargin === null ? 'Belum ada pendapatan' : `Margin ${statement.netMargin}%`,
            tone: loss ? 'negative' : 'positive',
          },
        ]}
      />

      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold">Laporan laba rugi</h3>
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <ol>
            {lines.map((line) => (
              <li
                key={line.label}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 border-b px-5 py-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_9rem]',
                  line.kind === 'result' && 'bg-muted/40',
                )}>
                <span className="min-w-0">
                  <span className={cn('block text-sm', line.kind === 'result' ? 'font-semibold' : 'font-medium')}>
                    {line.kind === 'cost' && <span className="text-muted-foreground">− </span>}
                    {line.kind === 'result' && <span className="text-muted-foreground">= </span>}
                    {line.label}
                  </span>
                  {line.note && <span className="block text-xs text-muted-foreground">{line.note}</span>}
                </span>
                <span className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-muted md:col-span-1 md:row-start-auto">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      line.kind === 'income'
                        ? 'bg-primary'
                        : line.kind === 'cost'
                          ? 'bg-status-cancelled/70'
                          : line.value < 0
                            ? 'bg-status-cancelled'
                            : 'bg-primary/50',
                    )}
                    style={{ width: `${Math.min(100, (Math.abs(line.value) / scale) * 100)}%` }}
                  />
                </span>
                <span
                  className={cn(
                    'tabular text-right text-sm',
                    line.kind === 'result' ? 'font-semibold' : 'font-medium',
                    line.kind === 'cost' && 'text-status-cancelled',
                  )}>
                  {line.kind === 'cost' ? `−${formatRupiah(line.value)}` : formatRupiah(line.value)}
                </span>
              </li>
            ))}
          </ol>
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 px-5 py-5',
              loss ? 'bg-status-cancelled-soft/70' : 'bg-secondary/70',
            )}>
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-white',
                  loss ? 'bg-status-cancelled' : 'bg-primary',
                )}>
                {loss ? (
                  <TrendingDownIcon className="size-4" aria-hidden />
                ) : (
                  <TrendingUpIcon className="size-4" aria-hidden />
                )}
              </span>
              <span>
                <span className="block font-semibold">{loss ? 'Rugi bersih' : 'Laba bersih'}</span>
                <span className="block text-xs text-muted-foreground">
                  {statement.netMargin === null
                    ? 'Belum ada pendapatan pada periode ini'
                    : `${statement.netMargin}% dari pendapatan`}
                </span>
              </span>
            </span>
            <span className={cn('numeral text-[1.75rem]', loss ? 'text-status-cancelled' : 'text-primary')}>
              {formatRupiah(statement.net)}
            </span>
          </div>
        </div>
      </section>

      <p className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        Pendapatan dihitung dari tagihan pasien umum yang lunas; tagihan batal tidak dihitung. Harga pokok obat termasuk
        obat pasien BPJS, sedangkan pendapatan kapitasi BPJS belum termasuk, jadi laba bisa tampak lebih kecil dari
        sebenarnya.
      </p>
    </div>
  );
}
