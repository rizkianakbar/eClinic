import Link from 'next/link';
import { cn } from '@/lib/utils';

type ReportsStatProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'negative';
  href?: string;
  /** % change vs the previous period; null hides it. */
  delta?: { value: number | null; label: string };
};

/** One figure: label, big number, a line of context. */
export function ReportsStat(props: ReportsStatProps) {
  const body = (
    <>
      <p className="text-[0.8125rem] font-medium text-muted-foreground">{props.label}</p>
      <p
        className={cn(
          'numeral mt-2 truncate text-[1.75rem]',
          props.tone === 'negative' ? 'text-destructive' : 'text-foreground',
        )}>
        {props.value}
      </p>
      {(props.hint || (props.delta && props.delta.value !== null)) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
          {props.delta && props.delta.value !== null && (
            <span
              className={cn(
                'tabular inline-flex items-center rounded-md px-1.5 text-xs leading-5 font-semibold',
                props.delta.value >= 0
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-status-cancelled-soft text-status-cancelled',
              )}
              title={props.delta.label}>
              {props.delta.value >= 0 ? '▲' : '▼'} {Math.abs(props.delta.value)}%
            </span>
          )}
          {props.hint}
        </p>
      )}
    </>
  );

  const className = 'flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]';

  return props.href ? (
    <Link href={props.href} className={cn(className, 'transition-colors hover:border-input')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
