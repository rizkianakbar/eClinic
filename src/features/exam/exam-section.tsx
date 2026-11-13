import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ExamSectionProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  /** One line under the title: what belongs here, or whether it is required. */
  description?: string;
  /** Short status on the right, e.g. "2 obat". */
  meta?: ReactNode;
  action?: ReactNode;
  /** Body without padding, for content that draws its own rows edge to edge (the SOAP sheet). */
  flush?: boolean;
  className?: string;
  children: ReactNode;
};

/** One part of the exam record as a card, anchored so the checklist and finish bar can jump to it. */
export function ExamSection(props: ExamSectionProps) {
  const Icon = props.icon;

  return (
    <section
      id={props.id}
      aria-labelledby={`${props.id}-title`}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]',
        props.className,
      )}>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${props.id}-title`} className="flex items-center gap-2 text-[0.9375rem] leading-tight font-semibold">
            {props.title}
            {props.meta !== undefined && (
              <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
                {props.meta}
              </span>
            )}
          </h2>
          {props.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{props.description}</p>}
        </div>
        {props.action}
      </header>
      <div data-flush={props.flush || undefined} className={props.flush ? undefined : 'p-4'}>
        {props.children}
      </div>
    </section>
  );
}
