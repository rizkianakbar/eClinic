"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { todayInJakarta } from "@/lib/dates";
import { SEX_LABELS } from "./patients.constants";
import { useCreatePatient, useUpdatePatient } from "./patients.hooks";
import { patientSchema, type PatientInput, type PatientValues } from "./patients.lib";

const EMPTY: PatientInput = {
  full_name: "",
  nik: "",
  bpjs_number: "",
  birth_date: "",
  sex: "" as PatientInput["sex"],
  phone: "",
  address: "",
};

type PatientFormProps =
  | { mode: "create" }
  | { mode: "edit"; patientId: string; defaultValues: PatientInput };

export function PatientForm(props: PatientFormProps) {
  const router = useRouter();
  const create = useCreatePatient();
  const update = useUpdatePatient(props.mode === "edit" ? props.patientId : "");
  const mutation = props.mode === "create" ? create : update;

  const form = useForm<PatientInput, unknown, PatientValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: props.mode === "edit" ? props.defaultValues : EMPTY,
  });
  const { errors } = form.formState;

  function onSubmit(values: PatientValues) {
    if (props.mode === "create") {
      create.mutate(values, {
        onSuccess: (patient) => {
          toast.success("Pasien baru tersimpan.");
          router.push(`/patients/${patient.id}`);
        },
      });
    } else {
      update.mutate(values, {
        onSuccess: () => {
          toast.success("Data pasien tersimpan.");
          form.reset(form.getValues());
          router.refresh();
        },
      });
    }
  }

  return (
    <form noValidate className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Nama lengkap" htmlFor="full_name" error={errors.full_name?.message} wide>
        <Input
          id="full_name"
          autoFocus={props.mode === "create"}
          autoComplete="off"
          aria-invalid={Boolean(errors.full_name)}
          {...form.register("full_name")}
        />
      </Field>

      <Field label="NIK" htmlFor="nik" error={errors.nik?.message} hint="16 digit, kosongkan jika belum ada">
        <Input id="nik" inputMode="numeric" autoComplete="off" aria-invalid={Boolean(errors.nik)} {...form.register("nik")} />
      </Field>

      <Field label="Nomor BPJS" htmlFor="bpjs_number" error={errors.bpjs_number?.message} hint="13 digit, opsional">
        <Input
          id="bpjs_number"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(errors.bpjs_number)}
          {...form.register("bpjs_number")}
        />
      </Field>

      <Field label="Tanggal lahir" htmlFor="birth_date" error={errors.birth_date?.message}>
        <Input
          id="birth_date"
          type="date"
          max={todayInJakarta()}
          aria-invalid={Boolean(errors.birth_date)}
          {...form.register("birth_date")}
        />
      </Field>

      <Field label="Jenis kelamin" htmlFor="sex" error={errors.sex?.message}>
        <NativeSelect id="sex" className="w-full" aria-invalid={Boolean(errors.sex)} {...form.register("sex")}>
          <NativeSelectOption value="">Pilih...</NativeSelectOption>
          {Object.entries(SEX_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Nomor HP" htmlFor="phone" error={errors.phone?.message} hint="Opsional">
        <Input id="phone" type="tel" autoComplete="off" aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
      </Field>

      <Field label="Alamat" htmlFor="address" error={errors.address?.message} hint="Opsional" wide>
        <Textarea id="address" rows={2} aria-invalid={Boolean(errors.address)} {...form.register("address")} />
      </Field>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={mutation.isPending || (props.mode === "edit" && !form.formState.isDirty)}>
          {mutation.isPending ? "Menyimpan..." : props.mode === "create" ? "Simpan pasien" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
};

function Field(props: FieldProps) {
  return (
    <div className={props.wide ? "flex flex-col gap-2 sm:col-span-2" : "flex flex-col gap-2"}>
      <Label htmlFor={props.htmlFor}>
        {props.label}
        {props.hint && <span className="font-normal text-muted-foreground">({props.hint})</span>}
      </Label>
      {props.children}
      {props.error && <p className="text-sm text-destructive">{props.error}</p>}
    </div>
  );
}
