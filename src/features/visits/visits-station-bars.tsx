import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { JOURNEY, type JourneyStatus } from './visits.lib';
import { STATION_COLORS } from './visits-journey-line';

type VisitsStationBarsProps = {
  counts: Record<JourneyStatus, number>;
  className?: string;
};

/** Where today's patients are: one bar per station, scaled to the busiest (owner's Beranda, company overview). */
export function VisitsStationBars(props: VisitsStationBarsProps) {
  const t = useTranslations('journey');
  const busiest = Math.max(1, ...Object.values(props.counts));

  return (
    <ul className={cn('flex flex-col justify-around gap-3', props.className)}>
      {JOURNEY.map((station) => {
        const color = STATION_COLORS[station.status];
        const count = props.counts[station.status];

        return (
          <li key={station.status} className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', color.line)} aria-hidden />
                {t(`${station.status}.label`)}
              </span>
              <span className="tabular font-semibold">{count}</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className={cn('block h-full rounded-full', color.line)}
                style={{ width: `${(count / busiest) * 100}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
