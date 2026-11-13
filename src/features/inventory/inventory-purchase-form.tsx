'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrescriptionsMedicinePicker } from '@/features/prescriptions/prescriptions-medicine-picker';
import { formatRupiah, parseRupiah } from '@/lib/money';
import { useActionMutation } from '@/lib/query';
import { receivePurchaseAction } from './inventory.actions';
import { type PurchaseFormInput, type PurchaseFormValues, purchaseFormSchema } from './inventory.lib';

type InventoryPurchaseFormProps = {
  today: string;
  suppliers: { id: string; name: string }[];
};

const EMPTY_LINE = { medicine: null, batch_no: '', expiry_date: '', qty: '', unit_cost: '' };

export function InventoryPurchaseForm(props: InventoryPurchaseFormProps) {
  const router = useRouter();
  const receive = useActionMutation(receivePurchaseAction);

  const form = useForm<PurchaseFormInput, unknown, PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema(props.today)),
    defaultValues: { supplier_id: '', invoice_no: '', purchase_date: props.today, note: '', items: [EMPTY_LINE] },
  });

  const lines = useFieldArray({ control: form.control, name: 'items' });
  const items = useWatch({ control: form.control, name: 'items' });
  const { errors } = form.formState;

  const subtotals = items.map((item) => (Number(item.qty) || 0) * (parseRupiah(String(item.unit_cost ?? '')) ?? 0));
  const total = subtotals.reduce((sum, value) => sum + value, 0);
  const lineError = errors.items?.root?.message ?? errors.items?.message;

  if (props.suppliers.length === 0) {
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Belum ada supplier aktif. Admin bisa menambahkannya di Pengaturan → Supplier.
      </p>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((values) =>
        receive.mutate(values, {
          onSuccess: (purchase) => {
            toast.success('Pembelian tersimpan. Stok bertambah.');
            router.push(`/inventory/purchases/${purchase.id}`);
          },
        }),
      )}>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
        <FormField label="Supplier" htmlFor="supplier_id" error={errors.supplier_id?.message}>
          <NativeSelect
            id="supplier_id"
            className="w-full"
            aria-invalid={Boolean(errors.supplier_id)}
            {...form.register('supplier_id')}>
            <NativeSelectOption value="">Pilih...</NativeSelectOption>
            {props.suppliers.map((supplier) => (
              <NativeSelectOption key={supplier.id} value={supplier.id}>
                {supplier.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="No. faktur" htmlFor="invoice_no" error={errors.invoice_no?.message} hint="opsional">
          <Input id="invoice_no" {...form.register('invoice_no')} />
        </FormField>
        <FormField label="Tanggal" htmlFor="purchase_date" error={errors.purchase_date?.message}>
          <Input id="purchase_date" type="date" max={props.today} {...form.register('purchase_date')} />
        </FormField>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">Obat</TableHead>
              <TableHead className="min-w-28">No. batch</TableHead>
              <TableHead className="min-w-36">Kedaluwarsa</TableHead>
              <TableHead className="min-w-20">Jumlah</TableHead>
              <TableHead className="min-w-28">Harga beli</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((field, index) => {
              const lineErrors = errors.items?.[index];

              const message =
                lineErrors?.medicine?.message ??
                lineErrors?.batch_no?.message ??
                lineErrors?.expiry_date?.message ??
                lineErrors?.qty?.message ??
                lineErrors?.unit_cost?.message;

              return (
                <TableRow key={field.id} className="align-top">
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`items.${index}.medicine`}
                      render={({ field: picker, fieldState }) => (
                        <PrescriptionsMedicinePicker
                          id={`line_${index}_medicine`}
                          value={picker.value}
                          onChange={picker.onChange}
                          invalid={Boolean(fieldState.error)}
                        />
                      )}
                    />
                    {message && <p className="mt-1 text-sm whitespace-normal text-destructive">{message}</p>}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="No. batch"
                      aria-invalid={Boolean(lineErrors?.batch_no)}
                      {...form.register(`items.${index}.batch_no`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Kedaluwarsa"
                      type="date"
                      min={props.today}
                      aria-invalid={Boolean(lineErrors?.expiry_date)}
                      {...form.register(`items.${index}.expiry_date`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Jumlah"
                      inputMode="numeric"
                      aria-invalid={Boolean(lineErrors?.qty)}
                      {...form.register(`items.${index}.qty`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Harga beli per satuan"
                      inputMode="numeric"
                      aria-invalid={Boolean(lineErrors?.unit_cost)}
                      {...form.register(`items.${index}.unit_cost`)}
                    />
                  </TableCell>
                  <TableCell className="text-right">{formatRupiah(subtotals[index] ?? 0)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus baris"
                      disabled={lines.fields.length === 1}
                      onClick={() => lines.remove(index)}>
                      <XIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {lineError && <p className="text-sm text-destructive">{lineError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button type="button" variant="outline" onClick={() => lines.append(EMPTY_LINE)}>
          <PlusIcon />
          Tambah baris
        </Button>
        <p className="text-lg font-semibold">Total {formatRupiah(total)}</p>
      </div>

      <FormField label="Catatan" htmlFor="note" error={errors.note?.message} hint="opsional" className="max-w-3xl">
        <Input id="note" {...form.register('note')} />
      </FormField>

      <div>
        <Button type="submit" disabled={receive.isPending}>
          {receive.isPending ? 'Menyimpan...' : 'Simpan pembelian'}
        </Button>
      </div>
    </form>
  );
}
