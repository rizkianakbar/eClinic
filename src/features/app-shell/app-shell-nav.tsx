"use client";

import { HeartPulseIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { isActivePath, ROLE_STATION, type NavItem } from "./app-shell.lib";
import { useAppShellLive } from "./app-shell-live";

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
  const activeHref = props.items.find((item) => isActivePath(pathname, item.href))?.href;

  // One underline that slides to the active tab when the page changes (and follows resizes).
  // Written straight to the DOM: no re-render per frame. The first placement does not animate.
  useLayoutEffect(() => {
    const line = indicator.current;
    const container = nav.current;
    if (!line || !container) return;
    const place = () => {
      const tab = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (!tab) {
        line.style.opacity = "0";
        return;
      }
      line.style.opacity = "1";
      line.style.width = `${tab.offsetWidth - 16}px`;
      line.style.transform = `translateX(${tab.offsetLeft + 8}px)`;
    };
    place();
    const enable = requestAnimationFrame(() => line.setAttribute("data-ready", ""));
    // Tabs change width when a live count appears, so watch them, not just the row.
    const observer = new ResizeObserver(place);
    observer.observe(container);
    container.querySelectorAll("a").forEach((tab) => observer.observe(tab));
    return () => {
      cancelAnimationFrame(enable);
      observer.disconnect();
    };
  }, [activeHref]);

  // The tab row is sticky; show the mini logo once the header above has scrolled away.
  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ownStation = ROLE_STATION[live.role];
  const countFor = (href: string) => {
    if (href === "/queue") return ownStation?.status === "waiting" ? live.mine.length : live.counts.waiting;
    if (href === "/pharmacy") return live.counts.to_pharmacy;
    if (href === "/cashier") return live.counts.to_cashier;
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
          "sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md transition-shadow duration-200",
          stuck && "shadow-[0_6px_16px_-12px_rgb(15_31_27/0.35)]",
        )}
      >
        <div className="flex items-center px-2 sm:px-4 lg:px-6">
          <Link
            href="/dashboard"
            aria-hidden={!stuck}
            tabIndex={stuck ? 0 : -1}
            className={cn(
              "flex shrink-0 items-center overflow-hidden transition-[width,opacity,margin] duration-200 ease-[var(--ease-out)]",
              stuck ? "mr-3 ml-2 w-8 opacity-100" : "w-0 opacity-0",
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-4" aria-hidden />
            </span>
          </Link>
          <nav
            ref={nav}
            aria-label="Menu utama"
            className="relative -mb-px flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none]"
            onMouseLeave={() => setHighlight(null)}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-2.5 bottom-2.5 left-0 rounded-md bg-black/5 transition-[transform,width,opacity] duration-150 ease-[var(--ease-out)]",
                highlight ? "opacity-100" : "opacity-0",
              )}
              style={highlight ? { transform: `translateX(${highlight.left}px)`, width: highlight.width } : undefined}
            />
            <span
              ref={indicator}
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground opacity-0 data-[ready]:transition-[transform,width] data-[ready]:duration-300 data-[ready]:ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
            {props.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const count = countFor(item.href);
              const own = ownStation?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={onPointerOver}
                  onFocus={(event) => setHighlight({ left: event.currentTarget.offsetLeft, width: event.currentTarget.offsetWidth })}
                  className={cn(
                    "relative flex h-13 shrink-0 items-center gap-1.5 px-3 text-sm whitespace-nowrap transition-colors duration-150",
                    active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "tabular flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold",
                        own ? "bg-primary text-primary-foreground" : "bg-black/7 text-foreground",
                      )}
                      aria-label={`${count} menunggu`}
                    >
                      {count}
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
