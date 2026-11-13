"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BanknoteIcon, LandmarkIcon, QrCodeIcon, ShieldCheckIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { formatRupiah, parseRupiah } from "@/lib/money";
import { useActionMutation } from "@/lib/query";
import { cn } from "@/lib/utils";
import { payInvoiceAction } from "./billing.actions";
import { PAYMENT_METHOD_LABELS } from "./billing.constants";
import { cashSuggestions, PAYMENT_METHODS, paymentSchema, type PaymentInput, type PaymentValues } from "./billing.lib";

type BillingPaymentFormProps = {
  invoiceId: string;
  total: number;
  payerType: string;
};

const METHOD_ICONS = { cash: BanknoteIcon, qris: QrCodeIcon, transfer: LandmarkIcon } as const;

/** Total, method, money in, change out: the cashier's whole job on one panel. */
export function BillingPaymentForm(props: BillingPaymentFormProps) {
  const pay = useActionMutation((values: PaymentValues | null) => payInvoiceAction(props.invoiceId, props.total, values));
  const form = useForm<PaymentInput, unknown, PaymentValues>({
    resolver: zodResolver(paymentSchema(props.total)),
    defaultValues: { method: "cash", cash_received: "", reference: "" },
  });
  const method = useWatch({ control: form.control, name: "method" });
  const received = parseRupiah(String(useWatch({ control: form.control, name: "cash_received" }) ?? ""));
  const { errors } = form.formState;
  const done = () => toast.success("Pembayaran selesai. Kunjungan ditutup.");
  const change = received !== null && received >= props.total ? received - props.total : null;

  if (props.payerType === "bpjs") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-lg bg-bpjs-soft p-3 text-sm text-bpjs">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Ditanggung BPJS. Pasien tidak membayar; selesaikan untuk menutup kunjungan.
        </div>
        <Button size="lg" disabled={pay.isPending} onClick={() => pay.mutate(null, { onSuccess: done })}>
          {pay.isPending ? "Memproses…" : "Selesaikan kunjungan"}
        </Button>
      </div>
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((values) => pay.mutate(values, { onSuccess: done }))}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Metode pembayaran</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((value) => {
            const Icon = METHOD_ICONS[value];
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary/20",
                  method === value
                    ? "border-primary bg-secondary/60 text-foreground shadow-[0_0_0_1px_var(--primary)]"
                    : "hover:bg-muted/60",
                )}
              >
                <input type="radio" value={value} className="sr-only" {...form.register("method")} />
                <Icon className={cn("size-5", method === value && "text-primary")} aria-hidden />
                {PAYMENT_METHOD_LABELS[value]}
              </label>
            );
          })}
        </div>
      </fieldset>

      {method === "cash" ? (
        <div className="flex flex-col gap-3">
          <FormField label="Uang diterima" htmlFor="cash_received" error={errors.cash_received?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="cash_received"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                className="tabular h-11 pl-9 text-lg font-semibold sm:text-lg"
                {...form.register("cash_received")}
              />
            </div>
          </FormField>
          <div className="flex flex-wrap gap-1.5">
            {cashSuggestions(props.total).map((amount, index) => (
              <Button
                key={amount}
                type="button"
                size="xs"
                variant="outline"
                className="tabular"
                onClick={() => form.setValue("cash_received", String(amount), { shouldValidate: true })}
              >
                {index === 0 ? "Uang pas" : formatRupiah(amount)}
              </Button>
            ))}
          </div>
          <div
            className={cn(
              "flex items-baseline justify-between rounded-lg px-3 py-2.5 transition-colors",
              change !== null ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <span className="text-sm font-medium">Kembalian</span>
            <span className="numeral text-[1.375rem]">{change !== null ? formatRupiah(change) : "–"}</span>
          </div>
        </div>
      ) : (
        <FormField
          label={method === "qris" ? "Referensi QRIS" : "Referensi transfer"}
          htmlFor="reference"
          error={errors.reference?.message}
          hint="opsional"
        >
          <Input id="reference" placeholder="Nomor/ID transaksi" {...form.register("reference")} />
        </FormField>
      )}

      <Button type="submit" size="lg" disabled={pay.isPending} className="w-full">
        {pay.isPending ? "Memproses…" : `Terima ${formatRupiah(props.total)}`}
      </Button>
    </form>
  );
}
