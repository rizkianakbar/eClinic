import { ArrowRightIcon, CheckCheckIcon, PackageCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { Elapsed } from '@/components/ui/elapsed';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import type { getOwnerDashboard } from '@/features/reports/reports.service';
import { JOURNEY, stationSince } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import { percentChange } from './home.lib';
import type { listCashierDesk, listLowStock } from './home.service';
import { HomeDeskRow } from './home-desk-row';
import { HomeOwnerTrend } from './home-owner-trend';

type HomeOwnerProps = {
  dashboard: Awaited<ReturnType<typeof getOwnerDashboard>>;
  unpaid: Awaited<ReturnType<typeof listCashierDesk>>;
  lowStock: Awaited<ReturnType<typeof listLowStock>>;
  /** Last 14 days, oldest first; the last entry is today. */
  revenue: { day: string; value: number }[];
  patients: { day: string; value: number }[];
  now: number;
};

/** The owner's day: money and patients against the last two weeks, where patients are now, what is stuck. */
export function HomeOwner(props: HomeOwnerProps) {
  const { dashboard } = props;

  const unpaidTotal = props.unpaid.reduce(
    (sum, visit) => sum + (visit.payer_type === 'umum' ? (visit.billTotal ?? 0) : 0),
    0,
  );

  const counts = Object.fromEntries(
    JOURNEY.map((station) => [station.status, dashboard.byStatus.get(station.status) ?? 0]),
  );

  counts.waiting += dashboard.byStatus.get('registered') ?? 0;

  const busiest = Math.max(1, ...Object.values(counts));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Tren 14 hari"
          link={{ href: '/reports', label: 'Laporan' }}
          variant="bare"
          className="lg:col-span-2">
          <HomeOwnerTrend
            metrics={[
              {
                key: 'revenue',
                label: 'Pendapatan hari ini',
                value: formatRupiah(dashboard.revenue),
                delta: percentChange(dashboard.revenue, props.revenue.at(-2)?.value ?? 0),
                hint: `${dashboard.paidInvoices} tagihan lunas`,
                series: props.revenue,
                unit: 'rupiah',
              },
              {
                key: 'patients',
                label: 'Pasien hari ini',
                value: String(dashboard.patients),
                delta: percentChange(dashboard.patients, props.patients.at(-2)?.value ?? 0),
                hint: `${dashboard.bpjsPatients} BPJS`,
                series: props.patients,
                unit: 'count',
              },
            ]}
          />
        </Panel>

        <Panel
          title="Pasien sekarang"
          count={dashboard.patients}
          link={{ href: '/queue', label: 'Antrean' }}
          className="h-full">
          <div className="flex h-full flex-col">
            <ul className="flex flex-1 flex-col justify-around gap-3 p-5">
              {JOURNEY.map((station) => {
                const color = STATION_COLORS[station.status];
                const count = counts[station.status];

                return (
                  <li key={station.status} className="flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className={cn('size-2 rounded-full', color.line)} aria-hidden />
                        {station.label}
                      </span>
                      <span className="tabular font-semibold">{count}</span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn('block h-full rounded-full', color.line)}
                        style={{ width: `${(count / busiest) * 100}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 text-[0.8125rem] text-muted-foreground">
              <span>
                <span className="tabular font-semibold text-foreground">{counts.done}</span> dari{' '}
                <span className="tabular">{dashboard.patients}</span> sudah pulang
              </span>
              <span>
                Batal{' '}
                <span className="tabular font-semibold text-foreground">
                  {dashboard.byStatus.get('cancelled') ?? 0}
                </span>
              </span>
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Belum dibayar"
          count={props.unpaid.length}
          dot="bg-line-cashier"
          link={{ href: '/cashier', label: 'Kasir' }}
          action={
            unpaidTotal > 0 && (
              <span className="tabular ml-auto text-[0.8125rem] font-medium">± {formatRupiah(unpaidTotal)}</span>
            )
          }>
          {props.unpaid.length === 0 ? (
            <PanelEmpty icon={<CheckCheckIcon />} title="Tidak ada tagihan tertunda" />
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {props.unpaid.map((visit) => (
                <HomeDeskRow
                  key={visit.id}
                  href={`/cashier/${visit.id}`}
                  number={visit.queue_no}
                  tone="bg-status-cashier-soft text-status-cashier"
                  name={visit.patient?.full_name ?? '-'}
                  bpjs={visit.payer_type === 'bpjs'}
                  meta={`${visit.poli?.name} · ${visit.doctor?.full_name}`}
                  aside={
                    <>
                      {visit.billTotal !== null && visit.payer_type === 'umum' && (
                        <span className="tabular hidden text-sm font-semibold sm:block">
                          {formatRupiah(visit.billTotal)}
                        </span>
                      )}
                      <Elapsed since={stationSince(visit)} now={props.now} />
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Stok perlu dipesan"
          count={props.lowStock.length}
          link={{ href: '/inventory?filter=low', label: 'Stok obat' }}>
          {props.lowStock.length === 0 ? (
            <PanelEmpty icon={<PackageCheckIcon />} title="Semua stok di atas minimum" />
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {props.lowStock.map((medicine) => {
                const ratio = Math.min(1, (medicine.qty_on_hand ?? 0) / Math.max(1, medicine.min_stock ?? 1));

                return (
                  <li key={medicine.medicine_id} className="border-b last:border-0">
                    <Link
                      href={`/inventory/medicines/${medicine.medicine_id}`}
                      className="group flex items-center gap-4 px-4 py-3 text-sm hover:bg-muted/50">
                      <span className="min-w-0 flex-1 truncate font-medium">{medicine.name}</span>
                      <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
                        <span
                          className="block h-full rounded-full bg-status-cancelled"
                          style={{ width: `${Math.max(4, ratio * 100)}%` }}
                        />
                      </span>
                      <span className="tabular w-20 text-right text-[0.8125rem] text-muted-foreground">
                        <span className="font-semibold text-status-cancelled">{medicine.qty_on_hand}</span> /{' '}
                        {medicine.min_stock}
                      </span>
                      <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
