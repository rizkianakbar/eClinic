import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PHARMACY_ROLES } from '@/features/inventory/inventory.constants';
import { nearExpiryCutoff } from '@/features/inventory/inventory.lib';
import { getStockSummary } from '@/features/inventory/inventory.service';
import { InventorySummarySkeleton } from '@/features/inventory/inventory-skeleton';
import { InventoryTabs } from '@/features/inventory/inventory-tabs';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { formatRupiahCompact } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export default async function InventoryLayout(props: LayoutProps<'/inventory'>) {
  await requireRole(...PHARMACY_ROLES);

  const t = await getTranslations();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{t('nav.inventory')}</h1>
          <p className="text-sm text-muted-foreground">{t('inventory.intro')}</p>
        </div>
        {/* The summary reads every batch: it streams in beside the list instead of holding the page. */}
        <Suspense fallback={<InventorySummarySkeleton />}>
          <StockSummary />
        </Suspense>
      </header>
      <div className="flex flex-col gap-6">
        <InventoryTabs />
        {props.children}
      </div>
    </>
  );
}

async function StockSummary() {
  const [summary, t, locale] = await Promise.all([
    createClient().then((supabase) => getStockSummary(supabase, nearExpiryCutoff(todayInJakarta()))),
    getTranslations('inventory.summary'),
    getLocale(),
  ]);

  const stats = [
    {
      label: t('active'),
      value: String(summary.medicines),
      hint: t('activeHint'),
      href: '/inventory',
    },
    {
      label: t('value'),
      value: formatRupiahCompact(summary.value, locale),
      hint: t('valueHint'),
      href: '/inventory',
    },
    {
      label: t('low'),
      value: String(summary.low),
      hint: t('lowHint'),
      href: '/inventory?filter=low',
      alert: summary.low > 0,
    },
    {
      label: t('expiring'),
      value: String(summary.expiring),
      hint: t('expiringHint'),
      href: '/inventory?filter=expiring',
      alert: summary.expiring > 0,
    },
  ];

  return (
    <nav
      aria-label={t('label')}
      className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:flex sm:divide-y-0">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="flex flex-col gap-0.5 px-4 py-2.5 transition-colors hover:bg-muted/40">
          <span className="text-xs text-muted-foreground">{stat.label}</span>
          <span className="flex items-baseline gap-1.5">
            <span className={cn('numeral text-xl', stat.alert && 'text-status-cancelled')}>{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
