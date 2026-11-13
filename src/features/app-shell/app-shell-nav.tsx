'use client';

import { HeartPulseIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const live = useAppShellLive();
  const [highlight, setHighlight] = useState<Highlight>(null);
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const logo = useRef<HTMLAnchorElement>(null);
  const spacer = useRef<HTMLSpanElement>(null);
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

  // The logo docks as the header scrolls away: progress 0 (top of page) → 1 (row stuck), written straight to the
  // two elements that use it, once per frame. Scroll-linked, not timed, so it follows the page exactly.
  useEffect(() => {
    const mark = sentinel.current;

    if (!mark) return;

    let frame = 0;

    const update = () => {
      frame = 0;

      // The row sticks once the header (and the 1px sentinel) has scrolled past.
      const distance = mark.offsetTop + mark.offsetHeight;
      const dock = String(Math.min(1, Math.max(0, window.scrollY / distance)));

      logo.current?.style.setProperty('--dock', dock);
      spacer.current?.style.setProperty('--dock', dock);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // The tab row is sticky; it gets its shadow once the header above has scrolled away.
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
      <div
        className={cn(
          'sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md transition-shadow duration-200',
          stuck && 'shadow-[0_6px_16px_-12px_rgb(15_31_27/0.35)]',
        )}>
        {/* The logo: in the header's spot at the top of the page, docked in this row once it sticks. It travels with
            the scroll (--dock 0 → 1), so it is one object moving down, not a second logo appearing. */}
        <Link
          ref={logo}
          href="/dashboard"
          aria-label="Beranda"
          className="absolute top-[calc(-3rem-1px)] left-4 z-10 flex sm:left-6 lg:left-8"
          style={{ translate: '0 calc(var(--dock, 0) * (3.625rem + 1px))' }}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(10_60_45/0.3)]">
            <HeartPulseIcon className="size-4.5" aria-hidden />
          </span>
        </Link>
        <div className="flex items-center px-2 sm:px-4 lg:px-6">
          {/* Room for the logo once it has come down into this row; widens with the scroll. */}
          <span ref={spacer} aria-hidden className="shrink-0" style={{ width: 'calc(var(--dock, 0) * 3.25rem)' }} />
          <nav
            ref={nav}
            aria-label="Menu utama"
            className={cn(
              'relative -mb-px flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-none',
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
                  {item.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'tabular flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold',
                        own ? 'bg-primary text-primary-foreground' : 'bg-black/7 text-foreground',
                      )}>
                      {count}
                      <span className="sr-only"> menunggu</span>
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
