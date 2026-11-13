'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** How long the pointer must rest on a link before it counts as intent (the instant.page heuristic). */
const HOVER_DELAY_MS = 65;
/** Matches `staleTimes.static` in next.config: a warmed page is reused for this long. */
const FRESH_MS = 30_000;
const SKIP = /^\/(print|api)\//;

function internalHref(target: EventTarget | null) {
  const anchor = target instanceof Element ? target.closest('a[href]') : null;

  if (!(anchor instanceof HTMLAnchorElement)) return null;

  if (anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.origin !== window.location.origin)
    return null;

  const href = anchor.pathname + anchor.search;

  if (SKIP.test(anchor.pathname) || href === window.location.pathname + window.location.search) return null;

  return href;
}

/**
 * SPA-speed navigation: when the user shows intent on any in-app link (pointer
 * rests on it, keyboard focus, or touch), the whole page, data included, is
 * fetched ahead, so the click renders from memory. Links in the viewport are
 * not prefetched in full: that would render every tab on every page load.
 */
export function AppShellPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const warmed = new Map<string, number>();
    let timer: number | undefined;

    function warm(href: string) {
      const last = warmed.get(href);

      if (last && Date.now() - last < FRESH_MS) return;

      warmed.set(href, Date.now());
      router.prefetch(href);
    }

    function onPointerOver(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;

      const href = internalHref(event.target);

      window.clearTimeout(timer);
      if (href) timer = window.setTimeout(() => warm(href), HOVER_DELAY_MS);
    }

    function onImmediate(event: Event) {
      const href = internalHref(event.target);

      if (href) warm(href);
    }

    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('touchstart', onImmediate, { passive: true });
    document.addEventListener('focusin', onImmediate);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('touchstart', onImmediate);
      document.removeEventListener('focusin', onImmediate);
    };
  }, [router]);

  return null;
}
