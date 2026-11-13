import { formatRupiah, formatRupiahCompact } from '@/lib/money';
import { cn } from '@/lib/utils';

type ReportsBarChartProps = {
  series: { day: string; value: number }[];
  unit: 'rupiah' | 'count';
  label: string;
};

const short = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });

/** Daily bars over the report period, with gridline values and a tooltip per bar. */
export function ReportsBarChart(props: ReportsBarChartProps) {
  const peak = Math.max(1, ...props.series.map((entry) => entry.value));
  const format = (value: number) => (props.unit === 'rupiah' ? formatRupiahCompact(value) : String(value));
  const full = (value: number) => (props.unit === 'rupiah' ? formatRupiah(value) : String(value));
  // Label at most ~10 days along the axis so they never crowd.
  const every = Math.max(1, Math.ceil(props.series.length / 10));
  const dayName = props.series.length <= 7;

  return (
    <div className="flex flex-col">
      <div className="relative h-48 pl-16">
        {[1, 0.5, 0].map((fraction) => (
          <div
            key={fraction}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ bottom: `${fraction * 100}%`, transform: 'translateY(50%)' }}
            aria-hidden>
            <span className="tabular w-14 shrink-0 text-right text-[0.6875rem] whitespace-nowrap text-muted-foreground">
              {format(Math.round(peak * fraction))}
            </span>
            <span
              className={cn('h-px flex-1', fraction === 0 ? 'bg-border' : 'border-t border-dashed border-border')}
            />
          </div>
        ))}
        <ol
          className={cn('relative flex h-full items-end', props.series.length > 40 ? 'gap-px' : 'gap-1')}
          aria-label={props.label}>
          {props.series.map((entry) => (
            <li key={entry.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-md bg-foreground px-2 py-1 text-[0.6875rem] whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{ bottom: `${Math.max(2, (entry.value / peak) * 100)}%` }}>
                {short.format(new Date(entry.day))} · {full(entry.value)}
              </span>
              <span
                className={cn(
                  'w-full rounded-t-[3px] transition-colors',
                  entry.value > 0 ? 'bg-primary/70 group-hover:bg-primary' : 'bg-transparent',
                )}
                style={{ height: `${(entry.value / peak) * 100}%` }}
              />
              <span className="sr-only">
                {entry.day}: {full(entry.value)}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <ol
        className={cn(
          'mt-2 flex pl-16 text-center text-[0.6875rem] text-muted-foreground',
          props.series.length > 40 ? 'gap-px' : 'gap-1',
        )}
        aria-hidden>
        {props.series.map((entry, index) => (
          <li key={entry.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
            {index % every === 0
              ? dayName
                ? weekday.format(new Date(entry.day))
                : short.format(new Date(entry.day))
              : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}
