import { CalendarPlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import type { listSchedules } from './schedules.service';
import { SchedulesDialog } from './schedules-dialog';
import { SchedulesWeek } from './schedules-week';

type Option = { id: string; name: string };

type SchedulesProps = {
  schedules: Awaited<ReturnType<typeof listSchedules>>;
  /** ISO weekday of today in Jakarta (1 = Monday), to mark today's column. */
  today: number;
  doctors: Option[];
  polis: Option[];
};

export function Schedules(props: SchedulesProps) {
  const t = useTranslations('schedules');
  const { doctors, polis } = props;

  if (doctors.length === 0 || polis.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <p>{t('needsBoth')}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {doctors.length === 0 && (
            <Link href="/settings/staff" className="underline">
              {t('addDoctor')}
            </Link>
          )}
          {polis.length === 0 && (
            <Link href="/settings/polis" className="underline">
              {t('addPoli')}
            </Link>
          )}
        </p>
      </div>
    );
  }

  const active = props.schedules.filter((schedule) => schedule.is_active);
  const quota = active.reduce((sum, schedule) => sum + schedule.quota, 0);
  const openDays = new Set(active.map((schedule) => schedule.day_of_week)).size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('summary', { sessions: active.length, days: openDays, quota })}
          </p>
        </div>
        <SchedulesDialog mode="create" doctors={doctors} polis={polis} />
      </div>

      {props.schedules.length === 0 ? (
        <EmptyState icon={CalendarPlusIcon} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <SchedulesWeek schedules={props.schedules} today={props.today} doctors={doctors} polis={polis} />
      )}
    </div>
  );
}
