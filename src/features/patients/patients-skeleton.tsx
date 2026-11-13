import { CakeIcon, ChevronLeftIcon, IdCardIcon, MapPinIcon, PhoneIcon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SegmentedSkeleton } from '@/components/ui/segmented-skeleton';
import { placeholders, Skeleton, SkeletonButton, SkeletonLine, SkeletonStats } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventorySearchSkeleton } from '@/features/inventory/inventory-search';
import { AGE_GROUPS } from './patients.lib';

/** The three totals beside the Pasien title. */
export function PatientsTotalsSkeleton() {
  const t = useTranslations('patients.totals');

  return (
    <SkeletonStats
      className="flex divide-y-0"
      items={[
        { label: t('active'), hint: t('activeHint') },
        { label: t('newThisMonth'), hint: t('newHint') },
        { label: t('bpjs') },
      ]}
    />
  );
}

/** The patient table (PatientsList): filter, search, and rows of the real height. */
export function PatientsListSkeleton() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedSkeleton options={[t('patients.filter.all'), t('payer.bpjs'), t('payer.umum')]} />
        <InventorySearchSkeleton placeholder={t('patients.listSearch')} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('patients.list.patient')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('patients.list.contact')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('patients.list.lastVisit')}</TableHead>
            <TableHead className="hidden text-right xl:table-cell">{t('patients.list.visits')}</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {placeholders(8).map((key) => (
            <TableRow key={key}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <span className="min-w-0">
                    <SkeletonLine className="w-40" />
                    <SkeletonLine className="w-36" />
                    <span className="sm:hidden">
                      <SkeletonLine className="w-28" />
                    </span>
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <SkeletonLine className="w-28" />
                <SkeletonLine className="w-40" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <SkeletonLine className="w-20" />
                <SkeletonLine className="w-24" />
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <span className="flex justify-end">
                  <SkeletonLine className="w-12" />
                </span>
              </TableCell>
              <TableCell>
                <span className="block size-4" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The side panel (PatientsComposition): real section titles and labels, the figures loading. */
export function PatientsCompositionSkeleton() {
  const t = useTranslations();

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-20">
      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold">{t('patients.composition.title')}</h2>
        <div className="flex flex-col divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {[
            [t('patients.composition.sex'), t('sex.male'), t('sex.female')],
            [t('patients.composition.payer'), t('payer.bpjs'), t('payer.umum')],
          ].map(([title, left, right]) => (
            <div key={title} className="flex flex-col gap-2.5 p-4">
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              <div className="h-2 rounded-full bg-muted" />
              <div className="flex justify-between text-[0.8125rem]">
                {[left, right].map((label) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-muted" aria-hidden />
                    {label}
                    <Skeleton className="h-3 w-8 rounded" />
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2.5 p-4">
            <p className="text-xs font-medium text-muted-foreground">{t('patients.composition.ages')}</p>
            <ul className="flex flex-col gap-2">
              {AGE_GROUPS.map((group) => (
                <li
                  key={group.key}
                  className="grid grid-cols-[8rem_minmax(0,1fr)_2rem] items-center gap-2 text-[0.8125rem]">
                  <span className="truncate">
                    {t(`patients.ageGroups.${group.key}`)}{' '}
                    <span className="text-xs text-muted-foreground">{group.range}</span>
                  </span>
                  <span className="h-1.5 rounded-full bg-muted" />
                  <span className="flex justify-end">
                    <Skeleton className="h-3 w-5 rounded" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CakeIcon className="size-4 text-[#d4588a]" aria-hidden />
          {t('patients.composition.birthdays')}
        </h2>
        <div className="rounded-xl border bg-card px-4 py-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <SkeletonLine className="w-56" />
        </div>
      </section>
    </aside>
  );
}

/** Riwayat kunjungan's list (VisitsHistoryList): a day group of visit rows. */
export function VisitHistorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonLine className="w-56" />
      <section className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <header className="flex items-center justify-between gap-3 rounded-t-xl border-b px-4 py-2.5">
          <SkeletonLine className="w-40" />
          <SkeletonLine size="xs" className="w-16" />
        </header>
        <ol className="divide-y">
          {placeholders(6).map((key) => (
            <li key={key} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <SkeletonLine className="w-40" />
                <SkeletonLine className="w-72" />
              </span>
              <span className="hidden flex-col items-end sm:flex">
                <SkeletonLine size="xs" className="w-16" />
                <SkeletonLine size="xs" className="w-10" />
              </span>
              <span className="size-4" />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** One patient's page: header, the profile card (real labels), and the visit timeline. */
export function PatientDetailSkeleton() {
  const t = useTranslations('patients');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Link
          href="/patients"
          className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeftIcon className="size-4" aria-hidden />
          {t('title')}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-2xl" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <SkeletonLine size="title" className="w-56" />
              <div className="flex flex-wrap items-center gap-1.5">
                {['w-28', 'w-20', 'w-24'].map((width) => (
                  <Skeleton key={width} className={`h-6 rounded-md ${width}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonButton className="w-24" />
            <SkeletonButton className="w-36" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">{t('detail.profile')}</h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <dl className="grid grid-cols-2 gap-px border-b bg-border">
              {[t('detail.totalVisits'), t('detail.last'), t('detail.since'), t('detail.bpjsVisits')].map((label) => (
                <div key={label} className="flex flex-col gap-1 bg-card px-4 py-3.5">
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd className="flex h-7 items-center">
                    <Skeleton className="h-4.5 w-16 rounded" />
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="flex flex-col divide-y">
              {(
                [
                  [IdCardIcon, 'NIK'],
                  [ShieldCheckIcon, t('form.bpjs')],
                  [CakeIcon, t('form.birthDate')],
                  [PhoneIcon, t('form.phone')],
                  [MapPinIcon, t('form.address')],
                ] as const
              ).map(([Icon, label]) => (
                <div key={label} className="flex items-start gap-3 px-4 py-3">
                  <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd>
                      <SkeletonLine className="w-40" />
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {t('detail.history')}
            <Skeleton className="h-5 w-6 rounded-md" />
          </h2>
          <ol className="flex flex-col">
            {placeholders(3).map((key) => (
              <li key={key} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4">
                <div className="flex flex-col items-center pt-1">
                  <Skeleton className="size-12 rounded-xl" />
                </div>
                <div className="mb-3 flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
                  <span className="flex items-center gap-3">
                    <SkeletonLine size="base" className="w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </span>
                  <SkeletonLine className="w-56" />
                  <SkeletonLine className="w-72" />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
