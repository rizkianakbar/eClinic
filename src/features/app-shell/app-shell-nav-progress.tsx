'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** A route's loading.tsx (SkeletonPage with `route`): the page is not there yet while one is on screen. */
const SKELETON = '[data-route-loading]';
/** A click that never lands (cancelled, offline) must not leave the bar hanging. */
const GIVE_UP_MS = 15_000;

/**
 * Instant feedback for every in-app link: a thin jade bar runs along the top
 * the moment a link is clicked, and completes when the new page's content is
 * on screen (URL changed and the loading skeleton gone), not merely when the
 * URL changes.
 */
export function AppShellNavProgress() {
  // One run per click (keys the bar so it restarts), and whether its page has arrived.
  const [run, setRun] = useState<{ id: number; done: boolean } | null>(null);

  useEffect(() => {
    let counter = 0;
    let stop: (() => void) | undefined;

    function onClick(event: MouseEvent) {
      // Not checking defaultPrevented: <Link> prevents the browser navigation to do its own.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;

      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download'))
        return;

      if (anchor.origin !== window.location.origin) return;

      const from = window.location.pathname + window.location.search;

      if (anchor.pathname + anchor.search === from) return;

      stop?.();

      const id = ++counter;

      setRun({ id, done: false });

      const finish = () => {
        stop?.();
        setRun((current) => (current?.id === id ? { id, done: true } : current));
      };

      const check = () => {
        const moved = window.location.pathname + window.location.search !== from;

        if (moved && !document.querySelector(SKELETON)) finish();
      };

      // Watch the page only while a navigation is in flight.
      const observer = new MutationObserver(check);

      observer.observe(document.body, { childList: true, subtree: true });

      const timer = window.setTimeout(finish, GIVE_UP_MS);

      stop = () => {
        observer.disconnect();
        window.clearTimeout(timer);
        stop = undefined;
      };
    }

    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      stop?.();
    };
  }, []);

  if (!run) return null;

  return (
    <div
      key={run.id}
      aria-hidden
      data-nav-progress
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-70 h-0.5 origin-left bg-primary shadow-[0_0_8px_var(--primary)]',
        run.done
          ? 'scale-x-100 opacity-0 transition-[scale,opacity] duration-300 ease-out'
          : 'scale-x-[0.9] opacity-100 transition-[scale] duration-3000 ease-[cubic-bezier(0.05,0.8,0.2,1)] starting:scale-x-0',
      )}
    />
  );
}
