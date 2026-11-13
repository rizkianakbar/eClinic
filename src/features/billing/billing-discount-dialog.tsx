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
import { formatRupiah } from "@/lib/money";
import { useActionMutation, type ActionResult } from "@/lib/query";
import { discountSchema, type DiscountInput, type DiscountValues } from "./billing.lib";

type BillingDiscountDialogProps = {
  label: string;
  title: string;
  /** Largest allowed discount, integer rupiah. */
  max: number;
  current: { amount: number; reason: string | null };
  action: (values: DiscountValues) => Promise<ActionResult>;
};

/** Discount in rupiah with a mandatory reason; 0 removes it. */
export function BillingDiscountDialog(props: BillingDiscountDialogProps) {
  const [open, setOpen] = useState(false);
  const save = useActionMutation(props.action);
  const defaults = { amount: String(props.current.amount), reason: props.current.reason ?? "" };
  const form = useForm<DiscountInput, unknown, DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(defaults);
      }}
    >
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
        {props.label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>Maksimal {formatRupiah(props.max)}. Isi 0 untuk menghapus diskon.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => {
            if (values.amount > props.max) {
              form.setError("amount", { message: `Diskon maksimal ${formatRupiah(props.max)}.` });
              return;
            }
            save.mutate(values, {
              onSuccess: () => {
                toast.success("Diskon tersimpan.");
                setOpen(false);
              },
            });
          })}
        >
          <FormField label="Diskon (Rp)" htmlFor="discount_amount" error={errors.amount?.message}>
            <Input id="discount_amount" inputMode="numeric" autoFocus {...form.register("amount")} />
          </FormField>
          <FormField label="Alasan" htmlFor="discount_reason" error={errors.reason?.message}>
            <Input id="discount_reason" placeholder="contoh: kontrol gratis, karyawan" {...form.register("reason")} />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Menyimpan..." : "Simpan diskon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
