import { ArrowRightIcon, CheckCheckIcon, PackageCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Elapsed } from '@/components/ui/elapsed';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import type { getOwnerDashboard } from '@/features/reports/reports.service';
import { JOURNEY, type JourneyStatus, stationSince } from '@/features/visits/visits.lib';
import { VisitsStationBars } from '@/features/visits/visits-station-bars';
import { formatRupiah } from '@/lib/money';
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
  const t = useTranslations();

  const unpaidTotal = props.unpaid.reduce(
    (sum, visit) => sum + (visit.payer_type === 'umum' ? (visit.billTotal ?? 0) : 0),
    0,
  );

  const counts = Object.fromEntries(
    JOURNEY.map((station) => [station.status, dashboard.byStatus.get(station.status) ?? 0]),
  ) as Record<JourneyStatus, number>;

  counts.waiting += dashboard.byStatus.get('registered') ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title={t('home.owner.trend')}
          link={{ href: '/reports', label: t('home.owner.reports') }}
          variant="bare"
          className="lg:col-span-2">
          <HomeOwnerTrend
            metrics={[
              {
                key: 'revenue',
                label: t('home.owner.revenueToday'),
                value: formatRupiah(dashboard.revenue),
                delta: percentChange(dashboard.revenue, props.revenue.at(-2)?.value ?? 0),
                hint: t('home.owner.paidInvoices', { count: dashboard.paidInvoices }),
                series: props.revenue,
                unit: 'rupiah',
              },
              {
                key: 'patients',
                label: t('home.owner.patientsToday'),
                value: String(dashboard.patients),
                delta: percentChange(dashboard.patients, props.patients.at(-2)?.value ?? 0),
                hint: t('home.owner.bpjsCount', { count: dashboard.bpjsPatients }),
                series: props.patients,
                unit: 'count',
              },
            ]}
          />
        </Panel>

        <Panel
          title={t('home.owner.now')}
          count={dashboard.patients}
          link={{ href: '/queue', label: t('home.owner.queue') }}
          className="h-full">
          <div className="flex h-full flex-col">
            <VisitsStationBars counts={counts} className="flex-1 p-5" />
            <p className="flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 text-[0.8125rem] text-muted-foreground">
              <span>
                {t.rich('home.owner.wentHome', {
                  done: counts.done,
                  total: dashboard.patients,
                  b: (chunks) => <span className="tabular font-semibold text-foreground">{chunks}</span>,
                })}
              </span>
              <span>
                {t('home.owner.cancelled')}{' '}
                <span className="tabular font-semibold text-foreground">
                  {dashboard.byStatus.get('cancelled') ?? 0}
                </span>
              </span>
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title={t('home.owner.unpaid')}
          count={props.unpaid.length}
          dot="bg-line-cashier"
          link={{ href: '/cashier', label: t('home.owner.cashier') }}
          action={
            unpaidTotal > 0 && (
              <span className="tabular ml-auto text-[0.8125rem] font-medium">± {formatRupiah(unpaidTotal)}</span>
            )
          }>
          {props.unpaid.length === 0 ? (
            <PanelEmpty icon={<CheckCheckIcon />} title={t('home.owner.noneUnpaid')} />
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
          title={t('home.owner.reorder')}
          count={props.lowStock.length}
          link={{ href: '/inventory?filter=low', label: t('home.owner.stock') }}>
          {props.lowStock.length === 0 ? (
            <PanelEmpty icon={<PackageCheckIcon />} title={t('home.owner.stockOk')} />
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
