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
import { Textarea } from "@/components/ui/textarea";
import { useActionMutation } from "@/lib/query";
import { createSupplierAction, updateSupplierAction } from "./inventory.actions";
import { supplierSchema, type SupplierInput, type SupplierValues } from "./inventory.lib";

type Supplier = SupplierValues & { id: string };

type InventorySupplierDialogProps = { mode: "create" } | { mode: "edit"; supplier: Supplier };

export function InventorySupplierDialog(props: InventorySupplierDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === "create" ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Tambah supplier
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Ubah
        </Button>
      )}
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Tambah supplier" : `Ubah ${props.supplier.name}`}</DialogTitle>
        </DialogHeader>
        <SupplierForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SupplierForm(props: InventorySupplierDialogProps & { onDone: () => void }) {
  const save = useActionMutation((values: SupplierValues) =>
    props.mode === "create" ? createSupplierAction(values) : updateSupplierAction(props.supplier.id, values),
  );
  const form = useForm<SupplierInput, unknown, SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues:
      props.mode === "edit"
        ? { name: props.supplier.name, phone: props.supplier.phone ?? "", address: props.supplier.address ?? "" }
        : { name: "", phone: "", address: "" },
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success("Supplier tersimpan.");
            props.onDone();
          },
        }),
      )}
    >
      <FormField label="Nama supplier" htmlFor="supplier_name" error={errors.name?.message}>
        <Input id="supplier_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </FormField>
      <FormField label="Telepon" htmlFor="supplier_phone" error={errors.phone?.message} hint="opsional">
        <Input id="supplier_phone" type="tel" aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
      </FormField>
      <FormField label="Alamat" htmlFor="supplier_address" error={errors.address?.message} hint="opsional">
        <Textarea id="supplier_address" rows={2} aria-invalid={Boolean(errors.address)} {...form.register("address")} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
