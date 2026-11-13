import { HistoryIcon, UsersIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { EXAM_VIEWER_ROLES } from '@/features/exam/exam.constants';
import { InventorySearch } from '@/features/inventory/inventory-search';
import { PATIENT_VIEWER_ROLES } from '@/features/patients/patients.constants';
import type { PatientStats } from '@/features/patients/patients.lib';
import { getPatientStats, listPatients, type PatientPayerFilter } from '@/features/patients/patients.service';
import { PatientsComposition } from '@/features/patients/patients-composition';
import { PatientsList } from '@/features/patients/patients-list';
import {
  PatientsCompositionSkeleton,
  PatientsTotalsSkeleton,
  VisitHistorySkeleton,
} from '@/features/patients/patients-skeleton';
import { type DateRange, parseRange } from '@/features/reports/reports.lib';
import { ReportsRangeFilter } from '@/features/reports/reports-range-filter';
import { listVisitHistory } from '@/features/visits/visits.service';
import { VisitsHistoryList } from '@/features/visits/visits-history-list';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('patients'))('title') };
}

const PAYERS: readonly PatientPayerFilter[] = ['all', 'bpjs', 'umum'];

type Stats = PatientStats;

export default async function PatientsPage(props: PageProps<'/patients'>) {
  const session = await requireRole(...PATIENT_VIEWER_ROLES);

  const params = await props.searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const page = Math.max(1, Number(params.page) || 1);
  const payer = PAYERS.find((value) => value === params.payer) ?? 'all';
  const history = params.view === 'riwayat';
  const today = todayInJakarta();
  const t = await getTranslations('patients');
  const supabase = await createClient();
  // Started now, awaited by the two panels that need it: they stream in after the list instead of holding it up.
  const stats = getPatientStats(supabase, today);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Suspense fallback={<PatientsTotalsSkeleton />}>
          <PatientsTotals stats={stats} />
        </Suspense>
      </header>
      <nav aria-label={t('view')} className={segmentedGroup}>
        <Link href="/patients" aria-current={history ? undefined : 'page'} className={segmentedItem(!history)}>
          <UsersIcon aria-hidden />
          {t('listView')}
        </Link>
        <Link
          href="/patients?view=riwayat"
          aria-current={history ? 'page' : undefined}
          className={segmentedItem(history)}>
          <HistoryIcon aria-hidden />
          {t('historyView')}
        </Link>
      </nav>
      {history ? (
        <VisitHistory
          searchParams={params}
          query={query}
          page={page}
          today={today}
          clinical={(EXAM_VIEWER_ROLES as readonly string[]).includes(session.role)}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <PatientsList
            {...(await listPatients(supabase, { query, page, payer }))}
            query={query}
            page={page}
            payer={payer}
            today={today}
          />
          <Suspense fallback={<PatientsCompositionSkeleton />}>
            <CompositionPanel stats={stats} today={today} />
          </Suspense>
        </div>
      )}
    </>
  );
}

type VisitHistoryProps = {
  searchParams: Awaited<PageProps<'/patients'>['searchParams']>;
  query: string;
  page: number;
  today: string;
  clinical: boolean;
};

/** Riwayat kunjungan: the period and search stay in place while the list for them streams in below. */
async function VisitHistory(props: VisitHistoryProps) {
  const t = await getTranslations('patients');
  const range = parseRange(props.searchParams, props.today);
  const keep = { view: 'riwayat', ...(props.query && { q: props.query }) };

  return (
    <div className="flex flex-col gap-4">
      <ReportsRangeFilter range={range} today={props.today} keep={keep} />
      <InventorySearch query={props.query} placeholder={t('historySearch')} className="max-w-md" />
      <Suspense key={`${range.from}:${range.to}:${props.query}:${props.page}`} fallback={<VisitHistorySkeleton />}>
        <VisitHistoryList
          range={range}
          query={props.query}
          page={props.page}
          today={props.today}
          clinical={props.clinical}
          params={{ ...keep, ...range }}
        />
      </Suspense>
    </div>
  );
}

type VisitHistoryListProps = {
  range: DateRange;
  query: string;
  page: number;
  today: string;
  clinical: boolean;
  params: Record<string, string>;
};

async function VisitHistoryList(props: VisitHistoryListProps) {
  const history = await listVisitHistory(await createClient(), props);

  return (
    <VisitsHistoryList
      {...history}
      page={props.page}
      today={props.today}
      clinical={props.clinical}
      params={props.params}
    />
  );
}

async function PatientsTotals(props: { stats: Promise<Stats> }) {
  const stats = await props.stats;
  const t = await getTranslations('patients.totals');
  const bpjsShare = stats.total > 0 ? Math.round((stats.bpjs / stats.total) * 100) : 0;

  return (
    <dl className="flex items-stretch divide-x rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      {[
        [t('active'), String(stats.total), t('activeHint')],
        [t('newThisMonth'), String(stats.newThisMonth), t('newHint')],
        [t('bpjs'), String(stats.bpjs), t('bpjsHint', { share: bpjsShare })],
      ].map(([label, value, hint]) => (
        <div key={label} className="flex flex-col gap-0.5 px-4 py-2.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="numeral text-xl">{value}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

async function CompositionPanel(props: { stats: Promise<Stats>; today: string }) {
  return <PatientsComposition stats={await props.stats} today={props.today} />;
}
