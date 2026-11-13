"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ROLE_LABELS } from "@/features/auth/auth.constants";
import type { Role } from "@/lib/auth";
import { useActionMutation } from "@/lib/query";
import { createStaffAction, updateStaffAction } from "./settings.actions";
import {
  assignableRoles,
  staffCreateSchema,
  staffSchema,
  type StaffCreateInput,
  type StaffCreateValues,
  type StaffValues,
} from "./settings.lib";

type Staff = {
  id: string;
  full_name: string;
  role: Role;
  nik: string | null;
  sip_number: string | null;
};

type SettingsStaffDialogProps = { actorRole: Role } & (
  | { mode: "create" }
  | {
      mode: "edit";
      staff: Staff;
      /** Account access controls (password reset, deactivate) shown under the form. */
      access?: ReactNode;
    }
);

export function SettingsStaffDialog(props: SettingsStaffDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === "create" ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Tambah staf
        </Button>
      ) : (
        <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
          Kelola
        </Button>
      )}
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Tambah staf" : props.staff.full_name}</DialogTitle>
          <DialogDescription>
            {props.mode === "create"
              ? "Staf masuk dengan email dan kata sandi ini. Berikan langsung ke orangnya."
              : "Ubah nama, peran, atau data praktik. Email tidak bisa diganti."}
          </DialogDescription>
        </DialogHeader>
        <StaffForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type StaffFormProps = SettingsStaffDialogProps & { onDone: () => void };

function StaffForm(props: StaffFormProps) {
  const isCreate = props.mode === "create";
  const create = useActionMutation(createStaffAction);
  const update = useActionMutation((values: StaffValues) =>
    updateStaffAction(props.mode === "edit" ? props.staff.id : "", values),
  );
  const pending = create.isPending || update.isPending;

  // One form type for both modes; edit mode simply has no email/password fields.
  const form = useForm<StaffCreateInput, unknown, StaffCreateValues>({
    resolver: zodResolver(isCreate ? staffCreateSchema : (staffSchema as unknown as typeof staffCreateSchema)),
    defaultValues:
      props.mode === "edit"
        ? { ...props.staff, nik: props.staff.nik ?? "", sip_number: props.staff.sip_number ?? "" }
        : { full_name: "", email: "", password: "", role: "" as Role, nik: "", sip_number: "" },
  });
  const { errors } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  function onSubmit(values: StaffCreateValues) {
    const onSuccess = () => {
      toast.success(isCreate ? "Akun staf dibuat. Berikan email dan kata sandinya ke staf." : "Data staf tersimpan.");
      props.onDone();
    };
    if (isCreate) create.mutate(values, { onSuccess });
    else update.mutate(values, { onSuccess });
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FormField label="Nama lengkap" htmlFor="full_name" error={errors.full_name?.message} hint="dengan gelar">
        <Input id="full_name" autoFocus aria-invalid={Boolean(errors.full_name)} {...form.register("full_name")} />
      </FormField>

      <FormField label="Peran" htmlFor="role" error={errors.role?.message}>
        <NativeSelect id="role" className="w-full" aria-invalid={Boolean(errors.role)} {...form.register("role")}>
          <NativeSelectOption value="">Pilih...</NativeSelectOption>
          {assignableRoles(props.actorRole).map((value) => (
            <NativeSelectOption key={value} value={value}>
              {ROLE_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      {isCreate && (
        <>
          <FormField label="Email" htmlFor="email" error={errors.email?.message} hint="untuk login">
            <Input id="email" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
          </FormField>
          <FormField label="Kata sandi awal" htmlFor="password" error={errors.password?.message} hint="min. 8 karakter">
            <Input
              id="password"
              type="text"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...form.register("password")}
            />
          </FormField>
        </>
      )}

      {(role === "doctor" || role === "nurse" || role === "pharmacist") && (
        <>
          <FormField label="NIK" htmlFor="nik" error={errors.nik?.message} hint="untuk SATUSEHAT">
            <Input id="nik" inputMode="numeric" aria-invalid={Boolean(errors.nik)} {...form.register("nik")} />
          </FormField>
          <FormField label="Nomor SIP" htmlFor="sip_number" error={errors.sip_number?.message} hint="opsional">
            <Input id="sip_number" aria-invalid={Boolean(errors.sip_number)} {...form.register("sip_number")} />
          </FormField>
        </>
      )}

      {props.mode === "edit" && props.access && (
        <section className="mt-2 flex flex-col gap-2 border-t pt-5">
          <h3 className="text-sm font-semibold">Akses akun</h3>
          <p className="text-[0.8125rem] text-muted-foreground">
            Atur ulang kata sandi jika staf lupa. Nonaktifkan saat staf berhenti; aksesnya langsung dicabut.
          </p>
          <div className="flex flex-wrap gap-2">{props.access}</div>
        </section>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : isCreate ? "Buat akun" : "Simpan perubahan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
