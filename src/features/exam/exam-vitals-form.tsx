"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useActionMutation } from "@/lib/query";
import { addVitalsAction } from "./exam.actions";
import { vitalsSchema, type VitalsInput, type VitalsValues } from "./exam.lib";

const FIELDS = [
  { name: "systolic", label: "Sistolik", unit: "mmHg" },
  { name: "diastolic", label: "Diastolik", unit: "mmHg" },
  { name: "pulse", label: "Nadi", unit: "x/mnt" },
  { name: "temperature", label: "Suhu", unit: "°C" },
  { name: "respiratory_rate", label: "Napas", unit: "x/mnt" },
  { name: "spo2", label: "SpO₂", unit: "%" },
  { name: "weight", label: "Berat badan", unit: "kg" },
  { name: "height", label: "Tinggi badan", unit: "cm" },
] as const;

const EMPTY: VitalsInput = Object.fromEntries(FIELDS.map((field) => [field.name, ""])) as VitalsInput;

type ExamVitalsFormProps = {
  visitId: string;
  onDone?: () => void;
};

export function ExamVitalsForm(props: ExamVitalsFormProps) {
  const save = useActionMutation((values: VitalsValues) => addVitalsAction(props.visitId, values));
  const form = useForm<VitalsInput, unknown, VitalsValues>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success("Tanda vital tersimpan.");
            form.reset(EMPTY);
            props.onDone?.();
          },
        }),
      )}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {FIELDS.map((field) => (
          <FormField key={field.name} label={field.label} htmlFor={`vital_${field.name}`} error={errors[field.name]?.message}>
            <div className="relative">
              <Input
                id={`vital_${field.name}`}
                inputMode="decimal"
                autoComplete="off"
                className="pr-14"
                aria-invalid={Boolean(errors[field.name])}
                {...form.register(field.name)}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                {field.unit}
              </span>
            </div>
          </FormField>
        ))}
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">Isi yang diukur saja; kolom kosong boleh dilewati.</p>
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Menyimpan..." : "Simpan tanda vital"}
        </Button>
      </div>
    </form>
  );
}
