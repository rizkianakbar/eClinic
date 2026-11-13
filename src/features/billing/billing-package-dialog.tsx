'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { formatRupiah } from '@/lib/money';
import { useActionMutation } from '@/lib/query';
import { setPackageItemsAction } from './billing.actions';
import { type PackageItemsInput, type PackageItemsValues, packageItemsSchema } from './billing.lib';

type BillingPackageDialogProps = {
  packageId: string;
  packageName: string;
  contents: { service_id: string; qty: number }[];
  /** Active non-package services that can go in a package. */
  services: { id: string; name: string; price: number }[];
};

/** Which services a package includes (shown on the invoice line). */
export function BillingPackageDialog(props: BillingPackageDialogProps) {
  const [open, setOpen] = useState(false);
  const save = useActionMutation((values: PackageItemsValues) => setPackageItemsAction(props.packageId, values));

  const defaults: PackageItemsInput = {
    items: props.contents.length > 0 ? props.contents : [{ service_id: '', qty: '1' }],
  };

  const form = useForm<PackageItemsInput, unknown, PackageItemsValues>({
    resolver: zodResolver(packageItemsSchema),
    defaultValues: defaults,
  });

  const rows = useFieldArray({ control: form.control, name: 'items' });
  const { errors } = form.formState;
  const listError = errors.items?.root?.message ?? errors.items?.message;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(defaults);
      }}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Isi paket
      </Button>
      <DialogContent variant="drawer" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Isi {props.packageName}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) =>
            save.mutate(values, {
              onSuccess: () => {
                toast.success('Isi paket tersimpan.');
                setOpen(false);
              },
            }),
          )}>
          {rows.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <NativeSelect
                aria-label="Layanan"
                className="flex-1"
                aria-invalid={Boolean(errors.items?.[index]?.service_id)}
                {...form.register(`items.${index}.service_id`)}>
                <NativeSelectOption value="">Pilih layanan...</NativeSelectOption>
                {props.services.map((service) => (
                  <NativeSelectOption key={service.id} value={service.id}>
                    {service.name} · {formatRupiah(service.price)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                aria-label="Jumlah"
                inputMode="numeric"
                className="w-20"
                {...form.register(`items.${index}.qty`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Hapus"
                disabled={rows.fields.length === 1}
                onClick={() => rows.remove(index)}>
                <XIcon />
              </Button>
            </div>
          ))}
          {listError && <p className="text-sm text-destructive">{listError}</p>}
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={() => rows.append({ service_id: '', qty: '1' })}>
              <PlusIcon />
              Layanan
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan isi paket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
