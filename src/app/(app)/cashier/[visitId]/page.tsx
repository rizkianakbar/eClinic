import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { SEX_LABELS } from "@/features/patients/patients.constants";
import { ageInYears, initials } from "@/features/patients/patients.lib";
import { CASHIER_ROLES } from "@/features/billing/billing.constants";
import {
  getCashierVisit,
  getVisitInvoice,
  listBillableServices,
  listVoidedInvoices,
} from "@/features/billing/billing.service";
import { BillingCreateInvoiceButton } from "@/features/billing/billing-create-invoice-button";
import { BillingInvoice } from "@/features/billing/billing-invoice";
import { VisitsJourneyPosition } from "@/features/visits/visits-journey-line";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { Tag } from "@/components/ui/tag";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tagihan" };

export default async function InvoicePage(
  props: PageProps<"/cashier/[visitId]">,
) {
  const session = await requireRole(...CASHIER_ROLES);
  const { visitId } = await props.params;
  if (!z.uuid().safeParse(visitId).success) notFound();

  const supabase = await createClient();
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
          className="-ml-1 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          Kasir
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-lg font-semibold text-white shadow-[0_8px_24px_-10px_rgb(15_61_51/0.55)]">
              {initials(patient.full_name)}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="truncate text-[1.5rem] leading-tight font-semibold tracking-tight">
                <Link
                  href={`/patients/${patient.id}`}
                  className="hover:underline"
                >
                  {patient.full_name}
                </Link>
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Tag>
                  {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]},{" "}
                  {ageInYears(patient.birth_date)} th
                </Tag>
                <Tag>
                  RM{" "}
                  <span className="tabular font-semibold">{patient.mrn}</span>
                </Tag>
                <Tag>
                  {visit.poli?.name} · {visit.doctor?.full_name}
                </Tag>
                {visit.payer_type === "bpjs" ? (
                  <Tag className="border-transparent bg-bpjs-soft text-bpjs">
                    BPJS
                  </Tag>
                ) : (
                  <Tag>Umum</Tag>
                )}
              </div>
            </div>
          </div>
          <VisitsJourneyPosition
            status={visit.status}
            className="w-full max-w-md"
          />
        </div>
      </header>

      {invoice ? (
        <BillingInvoice
          invoice={invoice}
          services={services}
          canVoid={session.role === "owner" || session.role === "admin"}
        />
      ) : visit.status === "to_cashier" ? (
        <BillingCreateInvoiceButton visitId={visit.id} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Pasien belum diteruskan ke kasir.
        </p>
      )}

      {voided.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.9375rem] font-semibold">
            Tagihan yang dibatalkan
          </h2>
          <ul className="overflow-hidden rounded-xl border bg-card text-sm">
            {voided.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-3 last:border-0"
              >
                <span>
                  <span className="tabular font-medium">{item.invoice_no}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {item.void_reason}
                  </span>
                </span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  <span className="tabular line-through">
                    {formatRupiah(item.total)}
                  </span>{" "}
                  · {item.voider?.full_name}
                  {item.voided_at && `, ${formatDateTime(item.voided_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
