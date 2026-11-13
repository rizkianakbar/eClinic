'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { initials } from '@/features/patients/patients.lib';
import { SettingsActiveToggle } from '@/features/settings/settings-active-toggle';
import { cn } from '@/lib/utils';
import { setScheduleActiveAction } from './schedules.actions';
import { DAY_LABELS } from './schedules.constants';
import { toHourMinute } from './schedules.lib';
import type { listSchedules } from './schedules.service';
import { SchedulesDialog } from './schedules-dialog';

type Option = { id: string; name: string };

type SchedulesWeekProps = {
  schedules: Awaited<ReturnType<typeof listSchedules>>;
  /** ISO weekday of today in Jakarta (1 = Monday). */
  today: number;
  doctors: Option[];
  polis: Option[];
};

/** One accent per doctor so a doctor's sessions are easy to follow across the week. */
const DOCTOR_ACCENTS = ['#4f6bed', '#c2417a', '#b7791f', '#2b8ab8', '#7c5cc4', '#3d8b5e', '#c25b2f', '#5a6b7d'];

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Whether the week is scrolled to its start or end (disables the arrow buttons). */
function edgesOf(el: HTMLElement) {
  return { start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 };
}

/** Scrolls the week so the given day's column sits in the middle. */
function centerDay(el: HTMLElement, day: number, behavior: ScrollBehavior) {
  const column = el.querySelector<HTMLElement>(`[data-day="${day}"]`);

  if (column)
    el.scrollTo({ left: column.offsetLeft - el.offsetLeft - (el.clientWidth - column.offsetWidth) / 2, behavior });
}

/**
 * The week as fixed-width day columns that scroll sideways. Opens on today,
 * which carries the only filled header, and can be narrowed to one doctor.
 */
export function SchedulesWeek(props: SchedulesWeekProps) {
  const { doctors, polis } = props;
  const scroller = useRef<HTMLOListElement>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const accent = new Map(doctors.map((doctor, index) => [doctor.id, DOCTOR_ACCENTS[index % DOCTOR_ACCENTS.length]]));

  const scheduledDoctors = doctors.filter((doctor) =>
    props.schedules.some((schedule) => schedule.doctor_id === doctor.id),
  );

  const visible = doctorId ? props.schedules.filter((schedule) => schedule.doctor_id === doctorId) : props.schedules;

  function scrollByColumn(direction: 1 | -1) {
    const el = scroller.current;
    const column = el?.querySelector<HTMLElement>('[data-day]');

    if (!el || !column) return;

    el.scrollBy({ left: direction * (column.offsetWidth + 12) * 2, behavior: 'smooth' });
  }

  function updateEdges() {
    if (scroller.current) setEdges(edgesOf(scroller.current));
  }

  // Open on today: a scroll position is a real side effect of mounting.
  useEffect(() => {
    const el = scroller.current;

    if (!el) return;

    centerDay(el, props.today, 'instant');
    setEdges(edgesOf(el));
  }, [props.today]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className={segmentedGroup}>
          <legend className="sr-only">Tampilkan dokter</legend>
          <button type="button" className={segmentedItem(doctorId === null)} onClick={() => setDoctorId(null)}>
            Semua dokter
          </button>
          {scheduledDoctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              className={segmentedItem(doctorId === doctor.id)}
              onClick={() => setDoctorId(doctorId === doctor.id ? null : doctor.id)}>
              <span className="size-2 rounded-full" style={{ background: accent.get(doctor.id) }} aria-hidden />
              {doctor.name}
            </button>
          ))}
        </fieldset>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroller.current && centerDay(scroller.current, props.today, 'smooth')}>
            Hari ini
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Hari sebelumnya"
            disabled={edges.start}
            onClick={() => scrollByColumn(-1)}>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Hari berikutnya"
            disabled={edges.end}
            onClick={() => scrollByColumn(1)}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <ol
        ref={scroller}
        onScroll={updateEdges}
        aria-label="Jadwal mingguan"
        className="-mx-1 flex snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto px-1 pb-3 scrollbar-thin">
        {DAYS.map((day) => {
          const sessions = visible.filter((schedule) => schedule.day_of_week === day);
          const active = sessions.filter((schedule) => schedule.is_active);
          const quota = active.reduce((sum, schedule) => sum + schedule.quota, 0);
          const isToday = day === props.today;

          return (
            <li
              key={day}
              data-day={day}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'flex w-66 shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-muted/40',
                isToday && 'border-primary/50 bg-secondary/40 shadow-[0_0_0_1px_var(--primary)]',
              )}>
              <header
                className={cn(
                  'flex items-center justify-between gap-2 border-b px-3 py-2.5',
                  isToday ? 'border-primary/30 bg-primary text-primary-foreground' : 'bg-card',
                )}>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {DAY_LABELS[day]}
                  {isToday && (
                    <span className="rounded-md bg-white/20 px-1.5 text-[0.6875rem] leading-5 font-medium">
                      Hari ini
                    </span>
                  )}
                </span>
                <span
                  className={cn('tabular text-xs', isToday ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                  {active.length === 0 ? 'Libur' : `${active.length} sesi · ${quota} kuota`}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {sessions.map((schedule) => (
                  <article
                    key={schedule.id}
                    className={cn(
                      'relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-card py-2.5 pr-2.5 pl-3.5 shadow-[0_1px_2px_rgb(20_32_29/0.04)]',
                      !schedule.is_active && 'border-dashed bg-card/50 opacity-60 shadow-none',
                    )}>
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: accent.get(schedule.doctor_id) }}
                      aria-hidden
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="tabular text-[0.9375rem] font-semibold tracking-tight">
                        {toHourMinute(schedule.start_time)}
                        <span className="text-muted-foreground">–{toHourMinute(schedule.end_time)}</span>
                      </p>
                      <span className="tabular text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{schedule.quota}</span> pasien
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold text-white"
                        style={{ background: accent.get(schedule.doctor_id) }}>
                        {initials(schedule.doctor?.full_name ?? '')}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-medium">
                          {schedule.doctor?.full_name ?? '-'}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {schedule.poli?.name}
                          {!schedule.is_active && ' · nonaktif'}
                        </span>
                      </span>
                    </div>
                    <div className="-mr-1 -mb-1 flex justify-end gap-0.5 border-t pt-1">
                      <SchedulesDialog mode="edit" schedule={schedule} doctors={doctors} polis={polis} />
                      <SettingsActiveToggle
                        id={schedule.id}
                        isActive={schedule.is_active}
                        action={setScheduleActiveAction}
                        name={`jadwal ${DAY_LABELS[schedule.day_of_week]} ${toHourMinute(schedule.start_time)}`}
                        consequence="Jadwal ini tidak dipakai untuk pendaftaran kunjungan baru."
                        size="xs"
                      />
                    </div>
                  </article>
                ))}
                {sessions.length === 0 && (
                  <p className="px-1 py-3 text-center text-[0.8125rem] text-muted-foreground">Tidak ada praktik</p>
                )}
                <div className="mt-auto">
                  <SchedulesDialog mode="create" day={day} doctors={doctors} polis={polis} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
