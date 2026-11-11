"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useActionMutation } from "@/lib/query";
import { createPoliAction, updatePoliAction } from "./settings.actions";
import { poliSchema, type PoliInput, type PoliValues } from "./settings.lib";

type Poli = { id: string; name: string; bpjs_poli_code: string | null };

type SettingsPoliDialogProps = { mode: "create" } | { mode: "edit"; poli: Poli };

export function SettingsPoliDialog(props: SettingsPoliDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === "create" ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Tambah poli
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Ubah
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Tambah poli" : `Ubah ${props.poli.name}`}</DialogTitle>
        </DialogHeader>
        <PoliForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PoliForm(props: SettingsPoliDialogProps & { onDone: () => void }) {
  const save = useActionMutation((values: PoliValues) =>
    props.mode === "create" ? createPoliAction(values) : updatePoliAction(props.poli.id, values),
  );
  const form = useForm<PoliInput, unknown, PoliValues>({
    resolver: zodResolver(poliSchema),
    defaultValues:
      props.mode === "edit"
        ? { name: props.poli.name, bpjs_poli_code: props.poli.bpjs_poli_code ?? "" }
        : { name: "", bpjs_poli_code: "" },
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success("Poli tersimpan.");
            props.onDone();
          },
        }),
      )}
    >
      <FormField label="Nama poli" htmlFor="poli_name" error={errors.name?.message} hint="contoh: Poli Umum">
        <Input id="poli_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </FormField>
      <FormField
        label="Kode poli BPJS"
        htmlFor="bpjs_poli_code"
        error={errors.bpjs_poli_code?.message}
        hint="opsional, untuk PCare"
      >
        <Input id="bpjs_poli_code" aria-invalid={Boolean(errors.bpjs_poli_code)} {...form.register("bpjs_poli_code")} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
