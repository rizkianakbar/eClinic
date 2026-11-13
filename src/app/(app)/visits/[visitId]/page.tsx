import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CASHIER_ROLES } from '@/features/billing/billing.constants';
import { EXAM_VIEWER_ROLES } from '@/features/exam/exam.constants';
import { PATIENT_VIEWER_ROLES } from '@/features/patients/patients.constants';
import { PAYER_LABELS } from '@/features/visits/visits.constants';
import { getVisit } from '@/features/visits/visits.service';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { requireRole } from '@/lib/auth';
import { formatDate, formatTime } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Kunjungan' };

/**
 * A past or current visit. Doctors, nurses and the owner get the full medical
 * record (the exam page, read-only once signed); others see the visit's facts.
 */
export default async function VisitPage(props: PageProps<'/visits/[visitId]'>) {
  const session = await requireRole(...PATIENT_VIEWER_ROLES);
  const { visitId } = await props.params;

  if (!z.uuid().safeParse(visitId).success) notFound();
  if ((EXAM_VIEWER_ROLES as readonly string[]).includes(session.role)) redirect(`/exam/${visitId}`);

  const visit = await getVisit(await createClient(), visitId);

  if (!visit?.patient) notFound();

  const canOpenBill = (CASHIER_ROLES as readonly string[]).includes(session.role) && visit.status !== 'cancelled';

  const facts: [string, string][] = [
    ['Tanggal', formatDate(visit.visit_date)],
    ['Didaftarkan', formatTime(visit.created_at)],
    ['Poli', visit.poli?.name ?? '–'],
    ['Dokter', visit.doctor?.full_name ?? '–'],
    ['Nomor antrean', String(visit.queue_no)],
    ['Pembayaran', PAYER_LABELS[visit.payer_type as keyof typeof PAYER_LABELS]],
  ];

  if (visit.cancel_reason) facts.push(['Alasan batal', visit.cancel_reason]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <PageHeader
          back={{ href: `/patients/${visit.patient.id}`, label: visit.patient.full_name }}
          title={`Kunjungan ${formatDate(visit.visit_date)}`}
          description={`${visit.patient.full_name} · RM ${visit.patient.mrn}`}
        />
        <VisitsJourneyPosition status={visit.status} className="w-full max-w-md" />
      </div>
      <dl className="grid gap-x-6 gap-y-4 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Catatan medis (SOAP, diagnosis, resep) hanya dapat dibuka oleh dokter, perawat, dan pemilik klinik.
      </p>
      {canOpenBill && (
        <div>
          <Link href={`/cashier/${visit.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Lihat tagihan
          </Link>
        </div>
      )}
    </>
  );
}
