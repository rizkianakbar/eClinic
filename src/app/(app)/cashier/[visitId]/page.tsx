import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { Tag } from '@/components/ui/tag';
import { CASHIER_ROLES } from '@/features/billing/billing.constants';
import {
  getCashierVisit,
  getVisitInvoice,
  listBillableServices,
  listVoidedInvoices,
} from '@/features/billing/billing.service';
import { BillingCreateInvoiceButton } from '@/features/billing/billing-create-invoice-button';
import { BillingInvoice } from '@/features/billing/billing-invoice';
import { ageInYears, initials } from '@/features/patients/patients.lib';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('billing.title');

export default async function InvoicePage(props: PageProps<'/cashier/[visitId]'>) {
  const session = await requireRole(...CASHIER_ROLES);
  const { visitId } = await props.params;

  if (!z.uuid().safeParse(visitId).success) notFound();

  const supabase = await createClient();
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  const [visit, invoice, services, voided] = await Promise.all([
    getCashierVisit(supabase, visitId),
    getVisitInvoice(supabase, visitId),
    listBillableServices(supabase),
    listVoidedInvoices(supabase, visitId),
  ]);

  if (!visit?.patient) notFound();

  const { patient } = visit;

  return (
    <>
      <header className="flex flex-col gap-4">
        <Link
          href="/cashier"
          className="-ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeftIcon className="size-4" aria-hidden />
          {t('nav.cashier')}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-lg font-semibold text-white shadow-[0_8px_24px_-10px_rgb(15_61_51/0.55)]">
              {initials(patient.full_name)}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="truncate text-[1.5rem] leading-tight font-semibold tracking-tight">
                <Link href={`/patients/${patient.id}`} className="hover:underline">
                  {patient.full_name}
                </Link>
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Tag>
                  {t(`sex.${patient.sex as 'male' | 'female'}`)},{' '}
                  {t('patients.ageShort', { age: ageInYears(patient.birth_date) })}
                </Tag>
                <Tag>
                  {t('patients.mrn')} <span className="tabular font-semibold">{patient.mrn}</span>
                </Tag>
                <Tag>
                  {visit.poli?.name} · {visit.doctor?.full_name}
                </Tag>
                {visit.payer_type === 'bpjs' ? (
                  <Tag className="border-transparent bg-bpjs-soft text-bpjs">{t('payer.bpjs')}</Tag>
                ) : (
                  <Tag>{t('payer.umum')}</Tag>
                )}
              </div>
            </div>
          </div>
          <VisitsJourneyPosition status={visit.status} className="w-full max-w-md" />
        </div>
      </header>

      {invoice ? (
        <BillingInvoice
          invoice={invoice}
          services={services}
          canVoid={session.role === 'owner' || session.role === 'admin'}
        />
      ) : visit.status === 'to_cashier' ? (
        <BillingCreateInvoiceButton visitId={visit.id} />
      ) : (
        <p className="text-sm text-muted-foreground">{t('billing.notAtCashier')}</p>
      )}

      {voided.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.9375rem] font-semibold">{t('billing.voided')}</h2>
          <ul className="overflow-hidden rounded-xl border bg-card text-sm">
            {voided.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-3 last:border-0">
                <span>
                  <span className="tabular font-medium">{item.invoice_no}</span>
                  <span className="text-muted-foreground"> · {item.void_reason}</span>
                </span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  <span className="tabular line-through">{formatRupiah(item.total)}</span> · {item.voider?.full_name}
                  {item.voided_at && `, ${formatDateTime(item.voided_at, locale)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
