"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
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
      <FormField label="Nama lengkap" htmlFor="full_name" error={errors.full_name?.message} className="sm:col-span-2">
        <Input
          id="full_name"
          autoFocus={props.mode === "create"}
          autoComplete="off"
          aria-invalid={Boolean(errors.full_name)}
          {...form.register("full_name")}
        />
      </FormField>

      <FormField label="NIK" htmlFor="nik" error={errors.nik?.message} hint="16 digit, kosongkan jika belum ada">
        <Input id="nik" inputMode="numeric" autoComplete="off" aria-invalid={Boolean(errors.nik)} {...form.register("nik")} />
      </FormField>

      <FormField label="Nomor BPJS" htmlFor="bpjs_number" error={errors.bpjs_number?.message} hint="13 digit, opsional">
        <Input
          id="bpjs_number"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(errors.bpjs_number)}
          {...form.register("bpjs_number")}
        />
      </FormField>

      <FormField label="Tanggal lahir" htmlFor="birth_date" error={errors.birth_date?.message}>
        <Input
          id="birth_date"
          type="date"
          max={todayInJakarta()}
          aria-invalid={Boolean(errors.birth_date)}
          {...form.register("birth_date")}
        />
      </FormField>

      <FormField label="Jenis kelamin" htmlFor="sex" error={errors.sex?.message}>
        <NativeSelect id="sex" className="w-full" aria-invalid={Boolean(errors.sex)} {...form.register("sex")}>
          <NativeSelectOption value="">Pilih...</NativeSelectOption>
          {Object.entries(SEX_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      <FormField label="Nomor HP" htmlFor="phone" error={errors.phone?.message} hint="Opsional">
        <Input id="phone" type="tel" autoComplete="off" aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
      </FormField>

      <FormField label="Alamat" htmlFor="address" error={errors.address?.message} hint="Opsional" className="sm:col-span-2">
        <Textarea id="address" rows={2} aria-invalid={Boolean(errors.address)} {...form.register("address")} />
      </FormField>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={mutation.isPending || (props.mode === "edit" && !form.formState.isDirty)}>
          {mutation.isPending ? "Menyimpan..." : props.mode === "create" ? "Simpan pasien" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
