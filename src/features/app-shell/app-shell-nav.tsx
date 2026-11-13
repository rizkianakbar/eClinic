'use client';

import { HeartPulseIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { markScrollEdges, revealInRow, SCROLL_EDGE_FADE } from '@/lib/scroll-edges';
import { cn } from '@/lib/utils';
import { isActivePath, type NavItem, ROLE_STATION } from './app-shell.lib';
import { useAppShellLive } from './app-shell-live';

type AppShellTabsProps = {
  items: readonly NavItem[];
};

type Highlight = { left: number; width: number } | null;

/**
 * Every destination as a tab under the header (Vercel's dashboard pattern):
 * a soft highlight follows the pointer, the current page is underlined, and
 * the station tabs carry live counts. Sticks on scroll; the logo slides in.
 */
export function AppShellTabs(props: AppShellTabsProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const live = useAppShellLive();
  const [highlight, setHighlight] = useState<Highlight>(null);
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  // The clicked tab turns active at once: the underline moves on click, not when the server answers.
  const [pending, setPending] = useState<string | null>(null);
  const [seenPath, setSeenPath] = useState(pathname);

  if (seenPath !== pathname) {
    // Arrived (or went elsewhere): the URL is the truth again. Adjusting state during render, per React docs.
    setSeenPath(pathname);
    setPending(null);
  }

  const activeHref = pending ?? props.items.find((item) => isActivePath(pathname, item.href))?.href;

  // One underline that slides to the active tab when the page changes (and follows resizes).
  // Written straight to the DOM: no re-render per frame. The first placement does not animate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeHref is the trigger; the effect reads the active tab from the DOM.
  useLayoutEffect(() => {
    const line = indicator.current;
    const container = nav.current;

    if (!line || !container) return;

    const place = () => {
      const tab = container.querySelector<HTMLElement>('[aria-current="page"]');

      if (!tab) {
        line.style.opacity = '0';

        return;
      }

      line.style.opacity = '1';
      line.style.width = `${tab.offsetWidth - 16}px`;
      line.style.transform = `translateX(${tab.offsetLeft + 8}px)`;
    };

    place();

    // Phones: bring the active tab into view when it sits off the scrolled row.
    const active = container.querySelector<HTMLElement>('[aria-current="page"]');

    if (active) revealInRow(container, active);

    markScrollEdges(container);

    const enable = requestAnimationFrame(() => line.setAttribute('data-ready', ''));

    // Tabs change width when a live count appears, so watch them, not just the row.
    const observer = new ResizeObserver(() => {
      place();
      markScrollEdges(container);
    });

    observer.observe(container);
    for (const tab of container.querySelectorAll('a')) observer.observe(tab);

    return () => {
      cancelAnimationFrame(enable);
      observer.disconnect();
    };
  }, [activeHref]);

  // The tab row is sticky; once the header above has scrolled away it gets its shadow (and, in browsers without
  // scroll-driven animations, the docked logo: see .shell-dock-* in globals.css).
  useEffect(() => {
    const element = sentinel.current;

    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const ownStation = ROLE_STATION[live.role];

  const countFor = (href: string) => {
    if (href === '/queue') return ownStation?.status === 'waiting' ? live.mine.length : live.counts.waiting;
    if (href === '/pharmacy') return live.counts.to_pharmacy;
    if (href === '/cashier') return live.counts.to_cashier;

    return 0;
  };

  function onPointerOver(event: MouseEvent<HTMLAnchorElement>) {
    const target = event.currentTarget;

    setHighlight({ left: target.offsetLeft, width: target.offsetWidth });
  }

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      {/* overflow-x-clip: the tabs slide right to make room for the logo; their far end is clipped, not scrolled. */}
      <div
        data-stuck={stuck ? '' : undefined}
        className={cn(
          'sticky top-0 z-40 overflow-x-clip border-b bg-card/90 backdrop-blur-md transition-shadow duration-200',
          stuck && 'shadow-[0_6px_16px_-12px_rgb(15_31_27/0.35)]',
        )}>
        {/* The logo: in the header's spot at the top of the page, docked in this row once it sticks. It travels with
            the scroll, so it is one object moving down, not a second logo appearing. */}
        <Link
          href="/dashboard"
          aria-label={t('nav.dashboard')}
          className="shell-dock-logo absolute top-[calc(-3rem-1px)] left-4 z-10 flex sm:left-6 lg:left-8">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(10_60_45/0.3)]">
            <HeartPulseIcon className="size-4.5" aria-hidden />
          </span>
        </Link>
        <div className="shell-dock-row flex items-center px-2 sm:px-4 lg:px-6">
          <nav
            ref={nav}
            aria-label={t('nav.main')}
            className={cn(
              'relative -mb-px flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-none',
              // Docked, the row sits 3.25rem further right: the same room at the end keeps the last tab reachable.
              stuck && 'pr-13',
              SCROLL_EDGE_FADE,
            )}
            onScroll={(event) => markScrollEdges(event.currentTarget)}
            onMouseLeave={() => setHighlight(null)}>
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-2.5 bottom-2.5 left-0 rounded-md bg-black/5 transition-[transform,width,opacity] duration-150 ease-out',
                highlight ? 'opacity-100' : 'opacity-0',
              )}
              style={highlight ? { transform: `translateX(${highlight.left}px)`, width: highlight.width } : undefined}
            />
            <span
              ref={indicator}
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground opacity-0 data-ready:transition-[transform,width] data-ready:duration-300 data-ready:ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
            {props.items.map((item) => {
              const active = item.href === activeHref;
              const count = countFor(item.href);
              const own = ownStation?.href === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={onPointerOver}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

                    if (item.href !== activeHref) setPending(item.href);
                  }}
                  onFocus={(event) =>
                    setHighlight({ left: event.currentTarget.offsetLeft, width: event.currentTarget.offsetWidth })
                  }
                  className={cn(
                    'relative flex h-13 shrink-0 items-center gap-1.5 px-3 text-sm whitespace-nowrap transition-colors duration-150',
                    active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}>
                  {t(`nav.${item.label}`)}
                  {count > 0 && (
                    <span
                      className={cn(
                        'tabular flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold',
                        own ? 'bg-primary text-primary-foreground' : 'bg-black/7 text-foreground',
                      )}>
                      {count}
                      <span className="sr-only">{t('shell.waitingSr')}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
