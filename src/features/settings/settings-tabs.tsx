'use client';

import {
  BuildingIcon,
  CalendarClockIcon,
  HistoryIcon,
  ListTreeIcon,
  PillIcon,
  StethoscopeIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { markScrollEdges, revealInRow, SCROLL_EDGE_FADE } from '@/lib/scroll-edges';
import { cn } from '@/lib/utils';

const GROUPS = [
  {
    label: 'Klinik',
    tabs: [
      { href: '/settings/clinic', label: 'Profil klinik', icon: BuildingIcon },
      { href: '/settings/staff', label: 'Staf', icon: UsersIcon },
      { href: '/settings/polis', label: 'Poli', icon: StethoscopeIcon },
      { href: '/settings/schedules', label: 'Jadwal dokter', icon: CalendarClockIcon },
    ],
  },
  {
    label: 'Data master',
    tabs: [
      { href: '/settings/services', label: 'Tarif layanan', icon: TagIcon },
      { href: '/settings/medicines', label: 'Obat', icon: PillIcon },
      { href: '/settings/suppliers', label: 'Supplier', icon: TruckIcon },
      { href: '/settings/icd10', label: 'ICD-10', icon: ListTreeIcon },
    ],
  },
  {
    label: 'Keamanan',
    tabs: [{ href: '/settings/activity', label: 'Log aktivitas', icon: HistoryIcon }],
  },
] as const;

/** Side menu on wide screens, a scrolling strip on phones. */
export function SettingsTabs() {
  const pathname = usePathname();
  const row = useRef<HTMLElement>(null);

  // Below lg the menu is one scrolling row: keep the current section in view and fade the clipped edges.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger; the effect reads the DOM.
  useEffect(() => {
    const element = row.current;
    const active = element?.querySelector<HTMLElement>('[aria-current="page"]');

    if (!element) return;

    if (active) revealInRow(element, active);

    markScrollEdges(element);
  }, [pathname]);

  return (
    <nav
      ref={row}
      aria-label="Bagian pengaturan"
      onScroll={(event) => markScrollEdges(event.currentTarget)}
      className={cn(
        '-mx-1 flex scrollbar-none gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:gap-4 lg:overflow-visible lg:px-0',
        SCROLL_EDGE_FADE,
      )}>
      {GROUPS.map((group) => (
        <div key={group.label} className="flex gap-1 lg:flex-col lg:gap-0.5">
          <p className="mb-1 hidden px-2.5 text-xs font-medium text-muted-foreground lg:block">{group.label}</p>
          {group.tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 shrink-0 items-center gap-2.5 rounded-lg pr-3 pl-1.5 text-sm whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
                  active
                    ? 'bg-card font-semibold text-foreground shadow-[0_0_0_1px_var(--border),0_1px_2px_rgb(20_32_29/0.06)]'
                    : 'font-medium text-muted-foreground hover:bg-black/4 hover:text-foreground',
                )}>
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-md transition-colors duration-150',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}>
                  <tab.icon className="size-3.5" aria-hidden />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
