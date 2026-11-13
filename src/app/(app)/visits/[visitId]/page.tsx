import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CASHIER_ROLES } from '@/features/billing/billing.constants';
import { EXAM_VIEWER_ROLES } from '@/features/exam/exam.constants';
import { PATIENT_VIEWER_ROLES } from '@/features/patients/patients.constants';
import { getVisit } from '@/features/visits/visits.service';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { formatDate, formatTime } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('visits.page.title');

/**
 * A past or current visit. Doctors, nurses and the owner get the full medical
 * record (the exam page, read-only once signed); others see the visit's facts.
 */
export default async function VisitPage(props: PageProps<'/visits/[visitId]'>) {
  const session = await requireRole(...PATIENT_VIEWER_ROLES);
  const { visitId } = await props.params;

  if (!z.uuid().safeParse(visitId).success) notFound();
  if ((EXAM_VIEWER_ROLES as readonly string[]).includes(session.role)) redirect(`/exam/${visitId}`);

  const [visit, t, locale] = await Promise.all([
    createClient().then((supabase) => getVisit(supabase, visitId)),
    getTranslations(),
    getLocale(),
  ]);

  if (!visit?.patient) notFound();

  const canOpenBill = (CASHIER_ROLES as readonly string[]).includes(session.role) && visit.status !== 'cancelled';

  const facts: [string, string][] = [
    [t('visits.page.date'), formatDate(visit.visit_date, locale)],
    [t('visits.page.registered'), formatTime(visit.created_at, locale)],
    [t('visits.page.poli'), visit.poli?.name ?? '–'],
    [t('visits.page.doctor'), visit.doctor?.full_name ?? '–'],
    [t('visits.page.queueNo'), String(visit.queue_no)],
    [t('visits.page.payment'), t(`payer.${visit.payer_type as 'umum' | 'bpjs'}`)],
  ];

  if (visit.cancel_reason) facts.push([t('visits.page.cancelReason'), visit.cancel_reason]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <PageHeader
          back={{ href: `/patients/${visit.patient.id}`, label: visit.patient.full_name }}
          title={t('visits.page.heading', { date: formatDate(visit.visit_date, locale) })}
          description={`${visit.patient.full_name} · ${t('patients.mrn')} ${visit.patient.mrn}`}
        />
        <VisitsJourneyPosition status={visit.status} className="w-full max-w-md" />
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">{t('visits.page.recordsNote')}</p>
      {canOpenBill && (
        <div>
          <Link href={`/cashier/${visit.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {t('visits.page.viewBill')}
          </Link>
        </div>
      )}
    </>
  );
}
