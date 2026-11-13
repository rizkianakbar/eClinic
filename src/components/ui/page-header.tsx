import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: ReactNode;
  /** One plain sentence: what this page is for. */
  description?: ReactNode;
  /** Primary actions, right-aligned on wide screens. */
  actions?: ReactNode;
  /** Where "back" goes (detail pages), with its label. */
  back?: { href: string; label: string };
  className?: string;
};

/** Every page starts the same way: where am I, what is this for, what can I do. */
export function PageHeader(props: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-2', props.className)}>
      {props.back && (
        <Link
          href={props.back.href}
          className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeftIcon className="size-4" aria-hidden />
          {props.back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[1.5rem] leading-tight font-semibold text-foreground">{props.title}</h1>
          {props.description && <p className="max-w-[65ch] text-sm text-muted-foreground">{props.description}</p>}
        </div>
        {props.actions && <div className="flex flex-wrap items-center gap-2">{props.actions}</div>}
      </div>
    </header>
  );
}
