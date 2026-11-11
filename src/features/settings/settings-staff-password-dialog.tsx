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
import { resetStaffPasswordAction } from "./settings.actions";
import { staffPasswordSchema, type StaffPasswordValues } from "./settings.lib";

type SettingsStaffPasswordDialogProps = {
  staffId: string;
  name: string;
};

export function SettingsStaffPasswordDialog(props: SettingsStaffPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const reset = useActionMutation((values: StaffPasswordValues) =>
    resetStaffPasswordAction(props.staffId, values.password),
  );
  const form = useForm<StaffPasswordValues>({
    resolver: zodResolver(staffPasswordSchema),
    defaultValues: { password: "" },
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Kata sandi
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur ulang kata sandi</DialogTitle>
          <DialogDescription>
            Kata sandi baru untuk {props.name}. Berikan langsung ke staf yang bersangkutan.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            reset.mutate(values, {
              onSuccess: () => {
                toast.success("Kata sandi diganti.");
                setOpen(false);
                form.reset();
              },
            }),
          )}
        >
          <FormField label="Kata sandi baru" htmlFor="new_password" error={errors.password?.message} hint="min. 8 karakter">
            <Input
              id="new_password"
              type="text"
              autoComplete="new-password"
              autoFocus
              aria-invalid={Boolean(errors.password)}
              {...form.register("password")}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={reset.isPending}>
              {reset.isPending ? "Menyimpan..." : "Simpan kata sandi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
