import { ActivityIcon, BanknoteIcon, HandCoinsIcon, ScaleIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { NavTabs } from '@/components/ui/nav-tabs';
import { cn } from '@/lib/utils';
import type { DateRange, ReportTab } from './reports.lib';

/** The reports in menu order; names and questions in messages (reports.tabs.<tab>, <tab>Question). */
export const REPORTS: { tab: ReportTab; icon: typeof BanknoteIcon }[] = [
  { tab: 'revenue', icon: BanknoteIcon },
  { tab: 'profit-loss', icon: ScaleIcon },
  { tab: 'doctor-fees', icon: HandCoinsIcon },
  { tab: 'visits', icon: UsersIcon },
  { tab: 'top-diseases', icon: ActivityIcon },
];

type ReportsTabsProps = {
  active: ReportTab;
  range: DateRange;
};

/** Which report: a described menu on wide screens, tabs on phones. */
export function ReportsTabs(props: ReportsTabsProps) {
  const t = useTranslations('reports.tabs');
  const href = (tab: ReportTab) => `?${new URLSearchParams({ tab, ...props.range })}`;

  return (
    <>
      <NavTabs
        label={t('label')}
        className="lg:hidden"
        tabs={REPORTS.map((report) => ({
          href: href(report.tab),
          label: t(report.tab),
          active: props.active === report.tab,
        }))}
      />
      <nav aria-label={t('label')} className="hidden flex-col gap-1 lg:flex">
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
                <span className={cn('block text-sm', active ? 'font-semibold' : 'font-medium')}>{t(report.tab)}</span>
                <span className="block text-xs text-muted-foreground">{t(`${report.tab}Question`)}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
