import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PanelProps = {
  title: string;
  /** A count next to the title. */
  count?: number;
  /** A small colour dot before the title (a journey station). */
  dot?: string;
  /** "See all" style link on the right. */
  link?: { href: string; label: string };
  action?: ReactNode;
  /** Draw the body as a framed list ("list") or leave it bare ("bare"). */
  variant?: 'list' | 'bare';
  className?: string;
  children: ReactNode;
};

/** A titled block. Every section in the app uses this header, so they all read the same. */
export function Panel(props: PanelProps) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-2.5', props.className)}>
      <header className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {props.dot && <span className={cn('size-2 rounded-full', props.dot)} aria-hidden />}
          {props.title}
          {props.count !== undefined && (
            <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
              {props.count}
            </span>
          )}
        </h2>
        {props.action}
        {props.link && (
          <Link
            href={props.link.href}
            className="group -my-2 inline-flex items-center gap-1 py-2 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {props.link.label}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </header>
      {props.variant === 'bare' ? (
        props.children
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {props.children}
        </div>
      )}
    </section>
  );
}

type PanelEmptyProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
};

/** Empty body of a list panel: calm, one line of what happens next. */
export function PanelEmpty(props: PanelEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
      {props.icon && <span className="mb-2 text-muted-foreground/70 [&_svg]:size-6">{props.icon}</span>}
      <p className="text-sm font-medium">{props.title}</p>
      {props.description && <p className="max-w-xs text-[0.8125rem] text-muted-foreground">{props.description}</p>}
    </div>
  );
}
