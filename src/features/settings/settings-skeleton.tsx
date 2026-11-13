import { FileSpreadsheetIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { placeholders, Skeleton, SkeletonAction, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { FieldSkeleton, InputFrame } from '@/features/inventory/inventory-skeleton';
import { ReportsRangeFilterSkeleton } from '@/features/reports/reports-skeleton';
import { weekdayKey } from '@/features/schedules/schedules.constants';
import { cn } from '@/lib/utils';

type MasterListSkeletonProps = {
  /** Left of the actions: the page's one-line explanation, or its search box. */
  intro: ReactNode;
  /** "Tambah …" label of the create button. */
  create: string;
  /** Master data that can be imported from Excel shows "Impor Excel" first. */
  importable?: boolean;
  columns: Parameters<typeof TableSkeleton>[0]['columns'];
  rows?: number;
  lines?: 1 | 2;
};

/** A master-data list (polis, services, medicines, suppliers): intro, actions, and the table. */
export function SettingsMasterListSkeleton(props: MasterListSkeletonProps) {
  const t = useTranslations('settings');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {props.intro}
        <div className="flex gap-2">
          {props.importable && (
            <SkeletonAction variant="outline" icon={<FileSpreadsheetIcon />}>
              {t('importExcel')}
            </SkeletonAction>
          )}
          <SkeletonAction icon={<PlusIcon />}>{props.create}</SkeletonAction>
        </div>
      </div>
      <TableSkeleton columns={props.columns} rows={props.rows ?? 8} lines={props.lines} />
    </div>
  );
}

/** Staf: heading, the count line, the button, and the people. */
export function SettingsStaffSkeleton() {
  const t = useTranslations('settings');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('staff.title')}</h2>
          <SkeletonLine className="w-80" />
        </div>
        <SkeletonAction icon={<PlusIcon />}>{t('staffForm.add')}</SkeletonAction>
      </div>
      <TableSkeleton
        rows={8}
        lines={2}
        columns={[
          { label: t('staff.colName'), bar: 'w-44' },
          { label: t('staff.colRole'), className: 'hidden sm:table-cell', bar: 'w-20' },
          { label: t('staff.colStatus'), className: 'hidden md:table-cell', bar: 'w-14' },
          { label: '', className: 'w-24' },
        ]}
      />
    </div>
  );
}

type SettingsSchedulesSkeletonProps = {
  /** ISO weekday of today (1 = Monday), highlighted as in the real board. */
  today: number;
};

/** Jadwal dokter: heading, summary, filter and the week board with every day's column. */
export function SettingsSchedulesSkeleton(props: SettingsSchedulesSkeletonProps) {
  const t = useTranslations('schedules');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <SkeletonLine className="w-96" />
        </div>
        <SkeletonAction icon={<PlusIcon />}>{t('add')}</SkeletonAction>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SkeletonButton size="sm" className="w-72" />
          <div className="flex items-center gap-1.5">
            <SkeletonButton size="sm" className="w-20" />
            <SkeletonButton size="sm" className="w-8" />
            <SkeletonButton size="sm" className="w-8" />
          </div>
        </div>
        <ol className="-mx-1 flex gap-3 overflow-hidden px-1 pb-3">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isToday = day === props.today;

            return (
              <li
                key={day}
                // The real board scrolls today's column to the middle (centerDay); start the outline there too:
                // seven 16.5rem columns with 0.75rem gaps, clamped to the scrollable range.
                style={
                  day === 1
                    ? {
                        marginLeft: `clamp(calc(100% - 120rem), calc(50% - 8.25rem - ${(props.today - 1) * 17.25}rem), 0rem)`,
                      }
                    : undefined
                }
                className={cn(
                  'flex w-66 shrink-0 flex-col overflow-hidden rounded-xl border bg-muted/40',
                  isToday && 'border-primary/50 bg-secondary/40 shadow-[0_0_0_1px_var(--primary)]',
                )}>
                <header
                  className={cn(
                    'flex items-center justify-between gap-2 border-b px-3 py-2.5',
                    isToday ? 'border-primary/30 bg-primary text-primary-foreground' : 'bg-card',
                  )}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {t(`days.${weekdayKey(day)}`)}
                    {isToday && (
                      <span className="rounded-md bg-white/20 px-1.5 text-[0.6875rem] leading-5 font-medium">
                        {t('today')}
                      </span>
                    )}
                  </span>
                  <SkeletonLine size="xs" className="w-20" />
                </header>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {placeholders(day < 7 ? 2 : 0).map((key) => (
                    <div
                      key={key}
                      className="flex flex-col gap-2 rounded-lg border bg-card py-2.5 pr-2.5 pl-3.5 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
                      <div className="flex items-center justify-between gap-2">
                        <SkeletonLine className="w-24" />
                        <SkeletonLine size="xs" className="w-14" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-6 shrink-0 rounded-full" />
                        <span className="flex min-w-0 flex-col">
                          <SkeletonLine className="w-32" />
                          <SkeletonLine size="xs" className="w-20" />
                        </span>
                      </div>
                      <div className="-mr-1 -mb-1 flex justify-end gap-0.5 border-t pt-1">
                        <SkeletonButton size="xs" className="w-12" />
                        <SkeletonButton size="xs" className="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

type SectionSkeletonProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function SectionSkeleton(props: SectionSkeletonProps) {
  return (
    <section className="grid grid-cols-1 gap-4 border-b px-5 py-5 last:border-b-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
      <div>
        <h2 className="text-sm font-semibold">{props.title}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{props.description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{props.children}</div>
    </section>
  );
}

/** Profil klinik: the three sections with their real titles and fields, and the letterhead preview. */
export function SettingsClinicSkeleton() {
  const t = useTranslations('settings.clinic');
  const tc = useTranslations('common');

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <SectionSkeleton title={t('identity')} description={t('identityHint')}>
            <div className="flex items-center gap-4">
              <Skeleton className="size-20 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <SkeletonButton size="sm" className="w-28" />
                <p className="text-xs text-muted-foreground">{t('logoHint')}</p>
              </div>
            </div>
            <FieldSkeleton label={t('name')} />
            <FieldSkeleton label={t('license')} hint={t('licenseHint')} />
          </SectionSkeleton>
          <SectionSkeleton title={t('contact')} description={t('contactHint')}>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm leading-none font-medium">{t('address')}</span>
              <InputFrame className="h-16" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldSkeleton label={t('phone')} />
              <FieldSkeleton label={t('email')} hint={tc('optional')} />
            </div>
          </SectionSkeleton>
          <SectionSkeleton title={t('security')} description={t('securityHint')}>
            <FieldSkeleton label={t('idle')} hint={t('idleHint')} />
          </SectionSkeleton>
        </div>
      </div>
      <aside className="flex flex-col gap-2.5 xl:sticky xl:top-19">
        <h2 className="text-sm font-semibold">{t('preview')}</h2>
        <Skeleton className="h-56 rounded-xl" />
      </aside>
    </div>
  );
}

/** Kode ICD-10: the count, the format note and the upload. */
export function SettingsIcd10Skeleton() {
  const t = useTranslations('settings.icd10');

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SkeletonLine className="w-80" />
      <div className="rounded-lg border p-4 text-sm">
        <p className="mb-2 font-medium">{t('format')}</p>
        <p className="text-muted-foreground">
          {t.rich('formatHint', { k: (chunks) => <span className="tabular">{chunks}</span> })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InputFrame className="max-w-xs" />
        <SkeletonButton className="w-16" />
      </div>
    </div>
  );
}

/** Log aktivitas: heading, the period and filters, then a day of entries. */
export function SettingsActivitySkeleton() {
  const t = useTranslations('settings.activity');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('intro')}</p>
        </div>
        <ReportsRangeFilterSkeleton />
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonButton size="sm" className="w-36" />
          <SkeletonButton size="sm" className="w-36" />
          <SkeletonButton size="sm" className="w-72" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <SkeletonLine className="w-56" />
        <section className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <header className="flex items-center justify-between gap-3 rounded-t-xl border-b px-4 py-2.5">
            <SkeletonLine className="w-40" />
            <SkeletonLine size="xs" className="w-16" />
          </header>
          <ol className="divide-y">
            {placeholders(8).map((key) => (
              <li key={key} className="grid grid-cols-[3rem_1.75rem_minmax(0,1fr)] gap-x-3 px-4 py-3">
                <SkeletonLine className="w-10" />
                <Skeleton className="size-7 rounded-full" />
                <SkeletonLine className="w-80" />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
