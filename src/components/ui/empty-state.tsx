import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  /** What to do next. An empty screen is an invitation to act. */
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState(props: EmptyStateProps) {
  const Icon = props.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center',
        props.className,
      )}>
      {Icon && (
        <span className="mb-1 flex size-10 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-[0_1px_2px_rgb(20_32_29/0.05)]">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="text-sm font-semibold">{props.title}</p>
      {props.description && <p className="max-w-[48ch] text-sm text-muted-foreground">{props.description}</p>}
      {props.action && <div className="mt-2">{props.action}</div>}
    </div>
  );
}
