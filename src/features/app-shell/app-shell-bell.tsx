'use client';

import { BellIcon, CheckCheckIcon } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Elapsed } from '@/components/ui/elapsed';
import { cn } from '@/lib/utils';
import { ROLE_STATION } from './app-shell.lib';
import { useAppShellLive } from './app-shell-live';

/** Who is waiting at my station, from any page: count on the bell, names and wait times inside. */
export function AppShellBell() {
  const live = useAppShellLive();
  const station = ROLE_STATION[live.role];

  if (!station) return null;

  const count = live.mine.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${station.label}: ${count}`}
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground data-popup-open:bg-black/5">
        <BellIcon className="size-4.5" aria-hidden />
        {count > 0 && (
          <span className="tabular absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-primary-foreground ring-2 ring-background">
            {count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">{station.label}</p>
          <Link href={station.href} className="text-xs font-medium text-muted-foreground hover:text-foreground">
            Lihat semua
          </Link>
        </div>
        {count === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
            <CheckCheckIcon className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Tidak ada yang menunggu</p>
            <p className="text-xs text-muted-foreground">Anda diberi tahu saat pasien baru tiba.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-1">
            {live.mine.map((visit, index) => (
              <DropdownMenuLinkItem
                key={visit.id}
                render={<Link href={live.hrefFor(visit)} />}
                className={cn('h-auto gap-3 py-2', index === 0 && 'bg-secondary/50')}>
                <span className="numeral flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm text-foreground">
                  {visit.queue_no}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{visit.patient?.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {visit.poli?.name} · {visit.doctor?.full_name}
                  </span>
                </span>
                <Elapsed since={visit.updated_at} now={0} />
              </DropdownMenuLinkItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
