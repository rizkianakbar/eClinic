import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { PATIENT_VIEWER_ROLES } from '@/features/patients/patients.constants';
import type { PatientStats } from '@/features/patients/patients.lib';
import { getPatientStats, listPatients, type PatientPayerFilter } from '@/features/patients/patients.service';
import { PatientsComposition } from '@/features/patients/patients-composition';
import { PatientsList } from '@/features/patients/patients-list';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pasien' };

const PAYERS: readonly PatientPayerFilter[] = ['all', 'bpjs', 'umum'];

type Stats = PatientStats;

export default async function PatientsPage(props: PageProps<'/patients'>) {
  await requireRole(...PATIENT_VIEWER_ROLES);

  const params = await props.searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const page = Math.max(1, Number(params.page) || 1);
  const payer = PAYERS.find((value) => value === params.payer) ?? 'all';
  const today = todayInJakarta();
  const supabase = await createClient();
  // Started now, awaited by the two panels that need it: they stream in after the list instead of holding it up.
  const stats = getPatientStats(supabase, today);
  const result = await listPatients(supabase, { query, page, payer });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Pasien</h1>
          <p className="text-sm text-muted-foreground">
            Semua pasien yang pernah terdaftar. Buka satu untuk melihat data dan riwayatnya.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-15 w-92 max-w-full rounded-xl" />}>
          <PatientsTotals stats={stats} />
        </Suspense>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PatientsList {...result} query={query} page={page} payer={payer} today={today} />
        <Suspense fallback={<SkeletonCard rows={5} />}>
          <CompositionPanel stats={stats} today={today} />
        </Suspense>
      </div>
    </>
  );
}

async function PatientsTotals(props: { stats: Promise<Stats> }) {
  const stats = await props.stats;
  const bpjsShare = stats.total > 0 ? Math.round((stats.bpjs / stats.total) * 100) : 0;

  return (
    <dl className="flex items-stretch divide-x rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      {[
        ['Pasien aktif', String(stats.total), 'terdaftar'],
        ['Baru bulan ini', String(stats.newThisMonth), 'pasien baru'],
        ['Peserta BPJS', String(stats.bpjs), `${bpjsShare}% dari semua`],
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
