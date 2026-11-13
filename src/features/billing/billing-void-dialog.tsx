"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useActionMutation } from "@/lib/query";
import { voidInvoiceAction } from "./billing.actions";
import { voidSchema, type VoidValues } from "./billing.lib";

type BillingVoidDialogProps = {
  invoiceId: string;
  invoiceNo: string;
};

/** Owner/admin: voids a paid invoice; the visit returns to the cashier for a corrected one. */
export function BillingVoidDialog(props: BillingVoidDialogProps) {
  const [open, setOpen] = useState(false);
  const voidInvoice = useActionMutation((values: VoidValues) => voidInvoiceAction(props.invoiceId, values));
  const form = useForm<VoidValues>({ resolver: zodResolver(voidSchema), defaultValues: { reason: "" } });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        Batalkan tagihan
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan {props.invoiceNo}?</DialogTitle>
          <DialogDescription>
            Tagihan tidak dihapus; statusnya menjadi Batal dengan alasan ini. Pasien kembali ke kasir untuk dibuatkan
            tagihan baru. Obat yang sudah diserahkan tidak berubah.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            voidInvoice.mutate(values, {
              onSuccess: () => {
                toast.success("Tagihan dibatalkan. Buat tagihan pengganti.");
                setOpen(false);
              },
            }),
          )}
        >
          <FormField label="Alasan" htmlFor="void_reason" error={errors.reason?.message}>
            <Input id="void_reason" autoFocus placeholder="contoh: salah input tindakan" {...form.register("reason")} />
          </FormField>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={voidInvoice.isPending}>
              {voidInvoice.isPending ? "Membatalkan..." : "Batalkan tagihan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
