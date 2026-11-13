import { ActivityIcon } from 'lucide-react';
import { VITAL_SHORT_LABELS, type VitalsReading, vitalItems } from '@/features/exam/exam.lib';
import { cn } from '@/lib/utils';

type QueueVitalChipsProps = {
  reading: VitalsReading | undefined;
  /** Hide weight/height/IMT to keep a row short. */
  essentialOnly?: boolean;
  className?: string;
};

const ESSENTIAL = new Set(['bp', 'pulse', 'temp', 'rr', 'spo2']);

/** The latest vitals as short chips, out-of-range values in red; a quiet note when triage is still to do. */
export function QueueVitalChips(props: QueueVitalChipsProps) {
  if (!props.reading) {
    return (
      <p className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', props.className)}>
        <ActivityIcon className="size-3.5" aria-hidden />
        Belum ada tanda vital
      </p>
    );
  }

  const items = vitalItems(props.reading).filter((item) => !props.essentialOnly || ESSENTIAL.has(item.key));

  return (
    <ul className={cn('flex flex-wrap gap-1', props.className)} aria-label="Tanda vital terakhir">
      {items.map((item) => (
        <li
          key={item.key}
          title={item.label}
          className={cn(
            'tabular inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs',
            item.flag ? 'bg-status-cancelled-soft font-medium text-status-cancelled' : 'bg-muted/80 text-foreground/80',
          )}>
          <span className={item.flag ? undefined : 'text-muted-foreground'}>
            {VITAL_SHORT_LABELS[item.key] ?? item.label}
          </span>
          {item.value}
        </li>
      ))}
    </ul>
  );
}
