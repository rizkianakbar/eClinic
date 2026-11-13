import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/ui/print-button";
import { CASHIER_ROLES, PAYMENT_METHOD_LABELS } from "@/features/billing/billing.constants";
import { getInvoice } from "@/features/billing/billing.service";
import { getClinicName } from "@/features/pharmacy/pharmacy.service";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kuitansi" };

/** 58 mm thermal receipt for a paid invoice. */
export default async function ReceiptPage(props: PageProps<"/print/receipt/[invoiceId]">) {
  await requireRole(...CASHIER_ROLES);
  const { invoiceId } = await props.params;
  if (!z.uuid().safeParse(invoiceId).success) notFound();

  const supabase = await createClient();
  const [invoice, clinic] = await Promise.all([getInvoice(supabase, invoiceId), getClinicName(supabase)]);
  if (!invoice || invoice.status !== "paid") notFound();
  const payment = invoice.payments[0];

  return (
    <main className="mx-auto flex w-[58mm] flex-col gap-1 p-2 text-[11px] leading-tight text-black print:p-0">
      <style>{"@page { size: 58mm auto; margin: 2mm; } @media print { body { background: white; } }"}</style>
      <div className="mb-2 print:hidden">
        <PrintButton />
      </div>
      <p className="text-center font-bold">{clinic?.name}</p>
      {clinic?.address && <p className="text-center">{clinic.address}</p>}
      {clinic?.phone && <p className="text-center">{clinic.phone}</p>}
      <hr className="my-1 border-dashed border-black" />
      <p>{invoice.invoice_no}</p>
      <p>{invoice.paid_at ? formatDateTime(invoice.paid_at) : ""}</p>
      <p>
        {invoice.visit?.patient?.full_name} · {invoice.visit?.patient?.mrn}
      </p>
      <hr className="my-1 border-dashed border-black" />
      {invoice.items.map((item) => (
        <div key={item.id}>
          <p>{item.description}</p>
          <p className="flex justify-between">
            <span>
              {item.qty} x {formatRupiah(item.unit_price)}
            </span>
            <span>{formatRupiah(item.qty * item.unit_price)}</span>
          </p>
          {item.discount > 0 && (
            <p className="flex justify-between">
              <span>Diskon</span>
              <span>-{formatRupiah(item.discount)}</span>
            </p>
          )}
        </div>
      ))}
      <hr className="my-1 border-dashed border-black" />
      {invoice.discount > 0 && (
        <p className="flex justify-between">
          <span>Diskon tagihan</span>
          <span>-{formatRupiah(invoice.discount)}</span>
        </p>
      )}
      <p className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{formatRupiah(invoice.total)}</span>
      </p>
      {invoice.payer_type === "bpjs" ? (
        <p className="text-center font-bold">Ditanggung BPJS Kesehatan</p>
      ) : (
        payment && (
          <>
            <p className="flex justify-between">
              <span>{PAYMENT_METHOD_LABELS[payment.method as keyof typeof PAYMENT_METHOD_LABELS]}</span>
              <span>{formatRupiah(payment.cash_received ?? payment.amount)}</span>
            </p>
            {payment.change !== null && (
              <p className="flex justify-between">
                <span>Kembali</span>
                <span>{formatRupiah(payment.change)}</span>
              </p>
            )}
          </>
        )
      )}
      <hr className="my-1 border-dashed border-black" />
      <p className="text-center">Kasir: {invoice.cashier?.full_name}</p>
      <p className="text-center">Terima kasih, semoga lekas sembuh.</p>
    </main>
  );
}
