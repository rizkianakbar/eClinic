'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, PillIcon, PlusIcon, PrinterIcon, ReceiptTextIcon, StethoscopeIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { formatDateTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import {
  addInvoiceServiceAction,
  removeInvoiceItemAction,
  setInvoiceDiscountAction,
  setItemDiscountAction,
} from './billing.actions';
import { INVOICE_ITEM_TYPE_LABELS, PAYMENT_METHOD_LABELS } from './billing.constants';
import {
  groupInvoiceItems,
  type InvoiceServiceInput,
  type InvoiceServiceValues,
  invoiceServiceSchema,
} from './billing.lib';
import type { getVisitInvoice, listBillableServices } from './billing.service';
import { BillingDiscountDialog } from './billing-discount-dialog';
import { BillingPaymentForm } from './billing-payment-form';
import { BillingVoidDialog } from './billing-void-dialog';

type Invoice = NonNullable<Awaited<ReturnType<typeof getVisitInvoice>>>;

type BillingInvoiceProps = {
  invoice: Invoice;
  services: Awaited<ReturnType<typeof listBillableServices>>;
  canVoid: boolean;
};

const GROUP_ICONS: Record<string, ReactNode> = {
  exam: <StethoscopeIcon />,
  medicine: <PillIcon />,
  service: <ReceiptTextIcon />,
  other: <ReceiptTextIcon />,
};

/** Left: the bill, by visit stage. Right: take the payment (draft) or the paid record. */
export function BillingInvoice(props: BillingInvoiceProps) {
  const { invoice } = props;
  const draft = invoice.status === 'draft';
  const remove = useActionMutation(removeInvoiceItemAction);
  const remainingForInvoiceDiscount = invoice.subtotal - invoice.item_discount;
  const groups = groupInvoiceItems(invoice.items);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <section aria-label="Rincian tagihan" className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Rincian tagihan
          <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
            {invoice.items.length}
          </span>
        </h2>

        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {groups.map((group) => (
            <div key={group.key} className="border-b">
              <p className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground [&_svg]:size-3.5">
                {GROUP_ICONS[group.key]}
                {group.label}
                <span className="tabular ml-auto font-medium">{formatRupiah(group.total)}</span>
              </p>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="group flex items-start gap-3 border-t px-4 py-3 text-sm first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-[0.8125rem] text-muted-foreground">
                        {INVOICE_ITEM_TYPE_LABELS[item.item_type]}
                        <span className="tabular">
                          {' '}
                          · {item.qty} × {formatRupiah(item.unit_price)}
                        </span>
                      </p>
                      {item.discount > 0 && (
                        <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-secondary px-1.5 text-xs leading-5 text-secondary-foreground">
                          Diskon −{formatRupiah(item.discount)} · {item.discount_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="tabular font-medium">{formatRupiah(item.amount)}</span>
                      {item.discount > 0 && (
                        <span className="tabular text-xs text-muted-foreground line-through">
                          {formatRupiah(item.qty * item.unit_price)}
                        </span>
                      )}
                      {draft && (
                        <div className="flex gap-0.5">
                          <BillingDiscountDialog
                            label="Diskon"
                            title={`Diskon · ${item.description}`}
                            max={item.qty * item.unit_price}
                            current={{ amount: item.discount, reason: item.discount_reason }}
                            action={(values) => setItemDiscountAction(item.id, values)}
                          />
                          {item.item_type === 'service' && (
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label="Hapus layanan"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate(item.id)}>
                              <XIcon />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {draft && (
            <div className="border-b bg-muted/20 px-4 py-3">
              <AddService invoiceId={invoice.id} services={props.services} />
            </div>
          )}
          <dl className="flex flex-col gap-1.5 px-4 py-3 text-sm">
            <TotalLine label="Subtotal" value={formatRupiah(invoice.subtotal)} />
            {invoice.item_discount > 0 && (
              <TotalLine label="Diskon per item" value={`−${formatRupiah(invoice.item_discount)}`} />
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1 text-muted-foreground">
                Diskon tagihan
                {invoice.discount > 0 && <span className="text-xs">({invoice.discount_reason})</span>}
                {draft && (
                  <BillingDiscountDialog
                    label={invoice.discount > 0 ? 'Ubah' : 'Tambah'}
                    title="Diskon tagihan"
                    max={remainingForInvoiceDiscount}
                    current={{ amount: invoice.discount, reason: invoice.discount_reason }}
                    action={(values) => setInvoiceDiscountAction(invoice.id, values)}
                  />
                )}
              </dt>
              <dd className="tabular">{invoice.discount > 0 ? `−${formatRupiah(invoice.discount)}` : '–'}</dd>
            </div>
          </dl>
          <div className="flex items-baseline justify-between gap-3 border-t bg-muted/30 px-4 py-4">
            <span className="text-sm font-semibold">
              {invoice.payer_type === 'bpjs' ? 'Total (ditanggung BPJS)' : 'Total tagihan'}
            </span>
            <span className="numeral text-[1.75rem]">{formatRupiah(invoice.total)}</span>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">{draft ? 'Pembayaran' : 'Pembayaran selesai'}</h2>
        {draft ? (
          <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <BillingPaymentForm invoiceId={invoice.id} total={invoice.total} payerType={invoice.payer_type} />
          </div>
        ) : (
          <PaidCard invoice={invoice} canVoid={props.canVoid} />
        )}
      </aside>
    </div>
  );
}

type PaidCardProps = {
  invoice: Invoice;
  canVoid: boolean;
};

/** The result, unmistakable: paid, how much, how, by whom; then print. */
function PaidCard(props: PaidCardProps) {
  const { invoice } = props;
  const bpjs = invoice.payer_type === 'bpjs';

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex flex-col items-center gap-2 bg-[linear-gradient(180deg,#eef8f4,#ffffff)] px-4 pt-6 pb-5 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgb(23_115_92/0.6)]">
          <CheckIcon className="size-5" strokeWidth={3} aria-hidden />
        </span>
        <p className="text-sm font-medium text-primary">{bpjs ? 'Selesai, ditanggung BPJS' : 'Lunas'}</p>
        <p className="numeral text-[2rem]">{formatRupiah(invoice.total)}</p>
        <p className="text-xs text-muted-foreground">
          {invoice.paid_at ? formatDateTime(invoice.paid_at) : ''} · {invoice.cashier?.full_name}
        </p>
      </div>
      {invoice.payments.length > 0 && (
        <dl className="flex flex-col gap-1.5 border-t px-4 py-3 text-sm">
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-1.5">
              <TotalLine
                label={PAYMENT_METHOD_LABELS[payment.method as keyof typeof PAYMENT_METHOD_LABELS]}
                value={formatRupiah(payment.amount)}
              />
              {payment.cash_received !== null && (
                <>
                  <TotalLine label="Uang diterima" value={formatRupiah(payment.cash_received)} />
                  <TotalLine label="Kembalian" value={formatRupiah(payment.change ?? 0)} />
                </>
              )}
              {payment.reference && <TotalLine label="Referensi" value={payment.reference} />}
            </div>
          ))}
        </dl>
      )}
      <div className="flex flex-col gap-1.5 border-t bg-muted/20 p-4">
        <Link
          href={`/print/receipt/${invoice.id}`}
          target="_blank"
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          <PrinterIcon />
          Cetak kuitansi
        </Link>
        <p className="tabular text-center text-xs text-muted-foreground">{invoice.invoice_no}</p>
        {props.canVoid && (
          <div className="flex justify-center">
            <BillingVoidDialog invoiceId={invoice.id} invoiceNo={invoice.invoice_no} />
          </div>
        )}
      </div>
    </div>
  );
}

type TotalLineProps = {
  label: string;
  value: string;
};

function TotalLine(props: TotalLineProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{props.label}</dt>
      <dd className="tabular">{props.value}</dd>
    </div>
  );
}

type AddServiceProps = {
  invoiceId: string;
  services: BillingInvoiceProps['services'];
};

/** Extra services (e.g. administration); the only lines the cashier can remove. */
function AddService(props: AddServiceProps) {
  const add = useActionMutation((values: InvoiceServiceValues) => addInvoiceServiceAction(props.invoiceId, values));

  const form = useForm<InvoiceServiceInput, unknown, InvoiceServiceValues>({
    resolver: zodResolver(invoiceServiceSchema),
    defaultValues: { service_id: '', qty: '1' },
  });

  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-1"
      onSubmit={form.handleSubmit((values) => add.mutate(values, { onSuccess: () => form.reset() }))}>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Tambah layanan" className="min-w-0 flex-1" {...form.register('service_id')}>
          <NativeSelectOption value="">Tambah layanan lain…</NativeSelectOption>
          {props.services.map((service) => (
            <NativeSelectOption key={service.id} value={service.id}>
              {service.name} · {formatRupiah(service.price)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input aria-label="Jumlah" inputMode="numeric" className="w-16" {...form.register('qty')} />
        <Button type="submit" variant="outline" disabled={add.isPending}>
          <PlusIcon />
          Tambah
        </Button>
      </div>
      {(errors.service_id ?? errors.qty) && (
        <p className="text-[0.8125rem] text-destructive">{errors.service_id?.message ?? errors.qty?.message}</p>
      )}
    </form>
  );
}
