"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrescriptionsMedicinePicker } from "@/features/prescriptions/prescriptions-medicine-picker";
import { formatRupiah } from "@/lib/money";
import { useActionMutation } from "@/lib/query";
import { addConsumableAction, removeConsumableAction } from "./exam.actions";
import { consumableFormSchema, type ConsumableFormInput, type ConsumableValues } from "./exam.lib";

type Consumable = { id: string; qty: number; medicine: { name: string; unit: string; price: number } | null };

type ExamConsumablesProps = {
  procedureId: string;
  consumables: Consumable[];
  editable: boolean;
};

const EMPTY: ConsumableFormInput = { medicine: null, qty: "1" };

/** Bahan habis pakai for one procedure: taken from stock when the record is signed, billed automatically. */
export function ExamConsumables(props: ExamConsumablesProps) {
  const add = useActionMutation((values: ConsumableValues) => addConsumableAction(props.procedureId, values));
  const remove = useActionMutation(removeConsumableAction);
  const form = useForm<ConsumableFormInput, unknown, ConsumableValues>({
    resolver: zodResolver(consumableFormSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  if (!props.editable && props.consumables.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-l-2 pl-3">
      <p className="text-xs font-medium text-muted-foreground">Bahan habis pakai</p>
      {props.consumables.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-xs">
          <span className="flex-1">
            {item.medicine?.name} · {item.qty} {item.medicine?.unit}
            {item.medicine && ` · ${formatRupiah(item.medicine.price * item.qty)}`}
          </span>
          {props.editable && (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Hapus bahan"
              disabled={remove.isPending}
              onClick={() => remove.mutate(item.id)}
            >
              <XIcon />
            </Button>
          )}
        </div>
      ))}
      {props.editable && (
        <form
          noValidate
          className="flex flex-wrap items-start gap-1"
          onSubmit={form.handleSubmit((values) => add.mutate(values, { onSuccess: () => form.reset(EMPTY) }))}
        >
          <div className="min-w-48 flex-1">
            <Controller
              control={form.control}
              name="medicine"
              render={({ field, fieldState }) => (
                <PrescriptionsMedicinePicker
                  id={`consumable_${props.procedureId}`}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                />
              )}
            />
          </div>
          <Input aria-label="Jumlah" inputMode="numeric" className="w-16" {...form.register("qty")} />
          <Button type="submit" size="sm" variant="ghost" disabled={add.isPending}>
            Tambah bahan
          </Button>
          {(errors.medicine ?? errors.qty) && (
            <p className="w-full text-xs text-destructive">{errors.medicine?.message ?? errors.qty?.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
