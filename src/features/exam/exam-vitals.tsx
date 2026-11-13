import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { type VitalItem, vitalItems } from './exam.lib';
import type { listVitals } from './exam.service';

type ExamVitalsProps = {
  vitals: Awaited<ReturnType<typeof listVitals>>;
  /** "rail": two columns for the side panel. */
  layout?: 'row' | 'rail';
};

/** The latest reading as a row of figures, out-of-range ones marked; earlier readings as text. */
export function ExamVitals(props: ExamVitalsProps) {
  const t = useTranslations('exam.vitals');
  const locale = useLocale();

  if (props.vitals.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('none')}</p>;
  }

  const [latest, ...earlier] = props.vitals;

  return (
    <div className="flex flex-col gap-3">
      <dl className={cn('grid grid-cols-2 gap-2', props.layout !== 'rail' && 'sm:grid-cols-4 xl:grid-cols-8')}>
        {vitalItems(latest, locale).map((item) => (
          <VitalTile key={item.key} item={item} />
        ))}
      </dl>
      <p className="text-[0.8125rem] text-muted-foreground">
        {t('recordedAt', { time: formatTime(latest.created_at, locale) })}
        {earlier.length > 0 &&
          t('earlier', {
            list: earlier
              .map(
                (reading) =>
                  `${formatTime(reading.created_at, locale)} (${vitalItems(reading, locale)
                    .map((item) => `${t(item.key)} ${item.value}`)
                    .join(', ')})`,
              )
              .join('; '),
          })}
      </p>
    </div>
  );
}

type VitalTileProps = {
  item: VitalItem;
};

function VitalTile(props: VitalTileProps) {
  const { item } = props;
  const t = useTranslations('exam.vitals');
  const Arrow = item.flag === 'high' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2',
        item.flag ? 'border-status-cancelled/25 bg-status-cancelled-soft/60' : 'bg-muted/40',
      )}>
      <dt className="text-xs font-medium text-muted-foreground">{t(item.key)}</dt>
      <dd className="flex items-baseline gap-1">
        <span className={cn('numeral text-[1.125rem]', item.flag && 'text-status-cancelled')}>{item.value}</span>
        <span className="text-xs text-muted-foreground">
          {item.unit === 'perMinute' ? t('unit.perMinute') : item.unit}
        </span>
        {item.flag && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-status-cancelled">
            <Arrow className="size-3" aria-hidden />
            {t(`flag.${item.flagLabel ?? item.flag}`)}
          </span>
        )}
      </dd>
    </div>
  );
}
