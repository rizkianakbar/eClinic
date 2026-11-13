import { ChevronLeftIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Elapsed } from '@/components/ui/elapsed';
import { nearExpiryCutoff } from '@/features/inventory/inventory.lib';
import { SEX_LABELS } from '@/features/patients/patients.constants';
import { ageInYears, initials } from '@/features/patients/patients.lib';
import { availableFromBatches, buildDrugLabels, toDispenseLines } from '@/features/pharmacy/pharmacy.lib';
import { getDispensation, getPharmacyVisit, listUsableBatches } from '@/features/pharmacy/pharmacy.service';
import { PharmacyDispenseForm } from '@/features/pharmacy/pharmacy-dispense-form';
import { PharmacyDispensed } from '@/features/pharmacy/pharmacy-dispensed';
import { getPrescription } from '@/features/prescriptions/prescriptions.service';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Penyerahan obat' };

export default async function DispensePage(props: PageProps<'/pharmacy/[visitId]'>) {
  await requireRole('pharmacist');

  const { visitId } = await props.params;

  if (!z.uuid().safeParse(visitId).success) notFound();

  const supabase = await createClient();

  const [visit, prescription, dispensation] = await Promise.all([
    getPharmacyVisit(supabase, visitId),
    getPrescription(supabase, visitId),
    getDispensation(supabase, visitId),
  ]);

  if (!visit?.patient) notFound();

  const medicineIds = [
    ...prescription.items,
    ...prescription.compounds.flatMap((compound) => compound.ingredients),
  ].flatMap((item) => (item.medicine ? [item.medicine.id] : []));

  const batches = await listUsableBatches(supabase, medicineIds);
  const lines = toDispenseLines(prescription, availableFromBatches(batches), batches);
  const { patient } = visit;
  const bpjs = visit.payer_type === 'bpjs';
  const waiting = visit.status === 'to_pharmacy' && !dispensation;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pharmacy"
        className="-mb-2 -ml-1 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Resep masuk
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-status-pharmacy-soft text-lg font-semibold text-status-pharmacy">
            {initials(patient.full_name)}
            <span className="tabular absolute -right-1 -bottom-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-card px-1 text-[0.6875rem] font-semibold shadow-[0_0_0_1px_var(--border)]">
              {visit.queue_no}
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[1.375rem] leading-tight font-semibold tracking-tight">
                {patient.full_name}
              </h1>
              <span
                className={cn(
                  'rounded-md px-1.5 text-xs leading-5 font-medium',
                  bpjs ? 'bg-bpjs-soft text-bpjs' : 'bg-muted text-muted-foreground',
                )}>
                {bpjs ? 'BPJS' : 'Umum'}
              </span>
              {/* Date.now() here is the server render time for the wait timer (first paint; they tick on the client). */}
              {waiting && <Elapsed since={visit.updated_at} now={Date.now()} />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              RM <span className="tabular font-medium text-foreground">{patient.mrn}</span> ·{' '}
              {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]}, {ageInYears(patient.birth_date)} tahun · resep dari{' '}
              <span className="font-medium text-foreground">{visit.doctor?.full_name}</span>, {visit.poli?.name}
            </p>
          </div>
        </div>
        <VisitsJourneyPosition status={visit.status} className="w-full max-w-md" />
      </header>

      {dispensation ? (
        <PharmacyDispensed
          visitId={visit.id}
          lines={lines}
          dispensation={dispensation}
          patientName={patient.full_name}
          labels={buildDrugLabels(
            prescription,
            new Set(
              dispensation.items.filter((item) => item.status === 'given').map((item) => item.prescription_item_id),
            ),
          )}
        />
      ) : waiting ? (
        lines.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            Resep kosong. Hubungi dokter pemeriksa.
          </p>
        ) : (
          <PharmacyDispenseForm
            visitId={visit.id}
            lines={lines}
            bpjs={bpjs}
            nearExpiryCutoff={nearExpiryCutoff(todayInJakarta())}
          />
        )
      ) : (
        <p className="rounded-2xl border border-dashed bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Kunjungan ini tidak sedang di farmasi.
        </p>
      )}
    </div>
  );
}
