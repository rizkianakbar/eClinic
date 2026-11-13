"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useActionMutation } from "@/lib/query";
import { createServiceAction, updateServiceAction } from "./billing.actions";
import { DOCTOR_FEE_TYPE_LABELS, SERVICE_TYPE_LABELS } from "./billing.constants";
import { serviceSchema, type ServiceInput, type ServiceValues } from "./billing.lib";

type Service = ServiceValues & { id: string };

type BillingServiceDialogProps = { mode: "create" } | { mode: "edit"; service: Service };

export function BillingServiceDialog(props: BillingServiceDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === "create" ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Tambah layanan
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Ubah
        </Button>
      )}
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Tambah layanan" : `Ubah ${props.service.name}`}</DialogTitle>
        </DialogHeader>
        <ServiceForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ServiceForm(props: BillingServiceDialogProps & { onDone: () => void }) {
  const save = useActionMutation((values: ServiceValues) =>
    props.mode === "create" ? createServiceAction(values) : updateServiceAction(props.service.id, values),
  );
  const form = useForm<ServiceInput, unknown, ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues:
      props.mode === "edit"
        ? { ...props.service }
        : { name: "", type: "consultation", price: "", doctor_fee_type: "none", doctor_fee_value: "" },
  });
  const { errors } = form.formState;
  const feeType = useWatch({ control: form.control, name: "doctor_fee_type" });

  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success("Layanan tersimpan.");
            props.onDone();
          },
        }),
      )}
    >
      <FormField label="Nama layanan" htmlFor="service_name" error={errors.name?.message} className="sm:col-span-2">
        <Input id="service_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </FormField>
      <FormField label="Jenis" htmlFor="service_type" error={errors.type?.message}>
        <NativeSelect id="service_type" className="w-full" {...form.register("type")}>
          {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Tarif" htmlFor="service_price" error={errors.price?.message}>
        <Input id="service_price" inputMode="numeric" aria-invalid={Boolean(errors.price)} {...form.register("price")} />
      </FormField>
      <FormField label="Jasa dokter" htmlFor="service_fee_type" error={errors.doctor_fee_type?.message}>
        <NativeSelect id="service_fee_type" className="w-full" {...form.register("doctor_fee_type")}>
          {Object.entries(DOCTOR_FEE_TYPE_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      {feeType !== "none" && (
        <FormField
          label={feeType === "percent" ? "Persentase" : "Nominal"}
          htmlFor="service_fee_value"
          hint={feeType === "percent" ? "% dari tarif" : "rupiah"}
          error={errors.doctor_fee_value?.message}
        >
          <Input
            id="service_fee_value"
            inputMode="numeric"
            aria-invalid={Boolean(errors.doctor_fee_value)}
            {...form.register("doctor_fee_value")}
          />
        </FormField>
      )}
      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
