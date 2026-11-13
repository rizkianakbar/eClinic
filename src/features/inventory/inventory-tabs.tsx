'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NavTabs } from '@/components/ui/nav-tabs';

const TABS = [
  {
    href: '/inventory',
    label: 'stock',
    match: (path: string) => path === '/inventory' || path.startsWith('/inventory/medicines'),
  },
  {
    href: '/inventory/purchases',
    label: 'purchases',
    match: (path: string) => path.startsWith('/inventory/purchases'),
  },
  { href: '/inventory/opname', label: 'opname', match: (path: string) => path.startsWith('/inventory/opname') },
] as const;

export function InventoryTabs() {
  const t = useTranslations('inventory.tabs');
  const pathname = usePathname();

  return (
    <NavTabs
      label={t('label')}
      tabs={TABS.map((tab) => ({ href: tab.href, label: t(tab.label), active: tab.match(pathname) }))}
    />
  );
}
