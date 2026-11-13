import { ActivityIcon, BanknoteIcon, HandCoinsIcon, ScaleIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { NavTabs } from '@/components/ui/nav-tabs';
import { cn } from '@/lib/utils';
import type { DateRange, ReportTab } from './reports.lib';

const REPORTS: { tab: ReportTab; label: string; question: string; icon: typeof BanknoteIcon }[] = [
  { tab: 'revenue', label: 'Pendapatan', question: 'Berapa uang masuk, dari mana', icon: BanknoteIcon },
  { tab: 'profit-loss', label: 'Laba rugi', question: 'Untung atau rugi setelah biaya', icon: ScaleIcon },
  { tab: 'doctor-fees', label: 'Jasa medis', question: 'Berapa hak tiap dokter', icon: HandCoinsIcon },
  { tab: 'visits', label: 'Kunjungan', question: 'Berapa pasien, baru atau lama', icon: UsersIcon },
  { tab: 'top-diseases', label: '10 besar penyakit', question: 'Diagnosis paling sering', icon: ActivityIcon },
];

type ReportsTabsProps = {
  active: ReportTab;
  range: DateRange;
};

/** Which report: a described menu on wide screens, tabs on phones. */
export function ReportsTabs(props: ReportsTabsProps) {
  const href = (tab: ReportTab) => `?${new URLSearchParams({ tab, ...props.range })}`;

  return (
    <>
      <NavTabs
        label="Jenis laporan"
        className="lg:hidden"
        tabs={REPORTS.map((report) => ({
          href: href(report.tab),
          label: report.label,
          active: props.active === report.tab,
        }))}
      />
      <nav aria-label="Jenis laporan" className="hidden flex-col gap-1 lg:flex">
        {REPORTS.map((report) => {
          const active = props.active === report.tab;

          return (
            <Link
              key={report.tab}
              href={href(report.tab)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                active ? 'bg-card shadow-[0_0_0_1px_var(--border),0_1px_2px_rgb(20_32_29/0.06)]' : 'hover:bg-black/4',
              )}>
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                <report.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={cn('block text-sm', active ? 'font-semibold' : 'font-medium')}>{report.label}</span>
                <span className="block text-xs text-muted-foreground">{report.question}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
