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
import { cancelVisitAction } from "./queue.actions";
import { useQueueAction } from "./queue.hooks";
import { cancelVisitSchema, type CancelVisitValues, type QueueVisit } from "./queue.lib";

type QueueCancelDialogProps = {
  visit: QueueVisit;
  visitDate: string;
};

export function QueueCancelDialog(props: QueueCancelDialogProps) {
  const [open, setOpen] = useState(false);
  const cancel = useQueueAction(props.visitDate, (values: CancelVisitValues) =>
    cancelVisitAction(props.visit.id, values),
  );
  const form = useForm<CancelVisitValues>({
    resolver: zodResolver(cancelVisitSchema),
    defaultValues: { reason: "" },
  });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Batalkan
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Batalkan antrean {props.visit.queue_no} ({props.visit.patient?.full_name})?
          </DialogTitle>
          <DialogDescription>Kunjungan tidak dihapus; status menjadi Batal dengan alasan ini.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            cancel.mutate(values, {
              onSuccess: () => {
                toast.success(`Antrean ${props.visit.queue_no} dibatalkan.`);
                setOpen(false);
                form.reset();
              },
            }),
          )}
        >
          <FormField label="Alasan" htmlFor="cancel_reason" error={errors.reason?.message}>
            <Input
              id="cancel_reason"
              autoFocus
              placeholder="contoh: pasien pulang, salah poli"
              aria-invalid={Boolean(errors.reason)}
              {...form.register("reason")}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={cancel.isPending}>
              {cancel.isPending ? "Membatalkan..." : "Batalkan antrean"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
