import { cn } from '@/lib/utils';

type ReportsKpisProps = {
  items: { label: string; value: string; hint?: string; tone?: 'default' | 'positive' | 'negative' }[];
};

/** A report's headline numbers in one strip: read left to right, no card-per-number. */
export function ReportsKpis(props: ReportsKpisProps) {
  return (
    <dl
      className="grid divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:divide-y-0 sm:divide-x"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(10rem, 1fr))` }}>
      {props.items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1 px-5 py-4">
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'numeral truncate text-[1.5rem]',
              item.tone === 'negative' && 'text-status-cancelled',
              item.tone === 'positive' && 'text-primary',
            )}>
            {item.value}
          </dd>
          {item.hint && <dd className="line-clamp-2 text-xs text-muted-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
