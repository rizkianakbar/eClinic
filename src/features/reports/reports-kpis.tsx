import { cn } from '@/lib/utils';

type ReportsKpisProps = {
  items: { label: string; value: string; hint?: string; tone?: 'default' | 'positive' | 'negative' }[];
};

/** A report's headline numbers in one strip: read left to right, no card-per-number. */
export function ReportsKpis(props: ReportsKpisProps) {
  return (
    <dl className="grid grid-cols-1 divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:divide-x sm:divide-y-0">
      {/* Phones: one row per number, label left and value right, so a long rupiah amount is never cut. */}
      {props.items.map((item) => (
        <div
          key={item.label}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 px-4 py-3 sm:flex sm:flex-col sm:gap-1 sm:px-5 sm:py-4">
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'numeral text-[1.25rem] sm:truncate sm:text-[1.5rem]',
              item.tone === 'negative' && 'text-status-cancelled',
              item.tone === 'positive' && 'text-primary',
            )}>
            {item.value}
          </dd>
          {item.hint && <dd className="col-span-2 line-clamp-2 text-xs text-muted-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
