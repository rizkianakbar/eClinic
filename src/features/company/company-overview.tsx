import { LayoutGridIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import type { getOrganizationOverview } from '@/features/branches/branches.service';
import { percentChange } from '@/features/home/home.lib';
import { HomeOwnerTrend } from '@/features/home/home-owner-trend';
import { VisitsStationBars } from '@/features/visits/visits-station-bars';
import { formatRupiah } from '@/lib/money';
import { companyTotals, stationCounts } from './company.lib';
import { CompanyBranchCard } from './company-branch-card';

type CompanyOverviewProps = {
  branches: Awaited<ReturnType<typeof getOrganizationOverview>>;
};

/**
 * The company's day, with the owner's Beranda building blocks: the 14-day trend and where patients are now, for all
 * branches together; then one card per branch to open it.
 */
export function CompanyOverview(props: CompanyOverviewProps) {
  const t = useTranslations();
  const totals = companyTotals(props.branches);
  const yesterday = totals.series.at(-2);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title={t('company.overview.trend')} variant="bare" className="lg:col-span-2">
          <HomeOwnerTrend
            metrics={[
              {
                key: 'revenue',
                label: t('home.owner.revenueToday'),
                value: formatRupiah(totals.revenue),
                delta: percentChange(totals.revenue, yesterday?.revenue ?? 0),
                hint: t('home.owner.paidInvoices', { count: totals.paidInvoices }),
                series: totals.series.map((entry) => ({ day: entry.day, value: entry.revenue })),
                unit: 'rupiah',
              },
              {
                key: 'patients',
                label: t('home.owner.patientsToday'),
                value: String(totals.patients),
                delta: percentChange(totals.patients, yesterday?.patients ?? 0),
                hint: t('home.owner.bpjsCount', { count: totals.bpjs }),
                series: totals.series.map((entry) => ({ day: entry.day, value: entry.patients })),
                unit: 'count',
              },
            ]}
          />
        </Panel>
        <Panel title={t('home.owner.now')} count={totals.patients} className="h-full">
          <VisitsStationBars counts={totals.counts} className="h-full p-5" />
        </Panel>
      </div>

      <Panel
        title={t('company.overview.branches')}
        count={props.branches.length}
        link={{ href: '/company/branches', label: t('company.overview.manage') }}
        variant="bare">
        {props.branches.length === 0 ? (
          <div className="rounded-xl border bg-card">
            <PanelEmpty icon={<LayoutGridIcon />} title={t('company.overview.empty')} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {props.branches.map((branch) => (
              <CompanyBranchCard
                key={branch.clinic_id}
                id={branch.clinic_id}
                name={branch.name}
                address={branch.address}
                counts={stationCounts(branch)}
                revenue={branch.revenue}
                bpjs={branch.bpjs}
                series={branch.series}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
