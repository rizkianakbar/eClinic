'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrescriptionsMedicinePicker } from '@/features/prescriptions/prescriptions-medicine-picker';
import { useMessage } from '@/i18n/message';
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
  const t = useTranslations('inventory');
  const tc = useTranslations('common');
  const message = useMessage();
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
    return <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t('purchaseForm.noSuppliers')}</p>;
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((values) =>
        receive.mutate(values, {
          onSuccess: (purchase) => {
            toast.success(t('purchaseForm.saved'));
            router.push(`/inventory/purchases/${purchase.id}`);
          },
        }),
      )}>
      <div className="grid grid-cols-1 max-w-3xl gap-4 sm:grid-cols-3">
        <FormField label={t('purchaseForm.supplier')} htmlFor="supplier_id" error={errors.supplier_id?.message}>
          <NativeSelect
            id="supplier_id"
            className="w-full"
            aria-invalid={Boolean(errors.supplier_id)}
            {...form.register('supplier_id')}>
            <NativeSelectOption value="">{t('purchaseForm.pick')}</NativeSelectOption>
            {props.suppliers.map((supplier) => (
              <NativeSelectOption key={supplier.id} value={supplier.id}>
                {supplier.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          label={t('purchaseForm.invoiceNo')}
          htmlFor="invoice_no"
          error={errors.invoice_no?.message}
          hint={tc('optional')}>
          <Input id="invoice_no" {...form.register('invoice_no')} />
        </FormField>
        <FormField label={t('purchaseForm.date')} htmlFor="purchase_date" error={errors.purchase_date?.message}>
          <Input id="purchase_date" type="date" max={props.today} {...form.register('purchase_date')} />
        </FormField>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">{t('purchase.colMedicine')}</TableHead>
              <TableHead className="min-w-28">{t('purchase.colBatch')}</TableHead>
              <TableHead className="min-w-36">{t('purchase.colExpiry')}</TableHead>
              <TableHead className="min-w-20">{t('purchase.colQty')}</TableHead>
              <TableHead className="min-w-28">{t('purchase.colCost')}</TableHead>
              <TableHead className="text-right">{t('purchase.colSubtotal')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((field, index) => {
              const lineErrors = errors.items?.[index];

              const lineMessage =
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
                    {lineMessage && (
                      <p className="mt-1 text-sm whitespace-normal text-destructive">{message(lineMessage)}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t('purchase.colBatch')}
                      aria-invalid={Boolean(lineErrors?.batch_no)}
                      {...form.register(`items.${index}.batch_no`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t('purchase.colExpiry')}
                      type="date"
                      min={props.today}
                      aria-invalid={Boolean(lineErrors?.expiry_date)}
                      {...form.register(`items.${index}.expiry_date`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t('purchase.colQty')}
                      inputMode="numeric"
                      aria-invalid={Boolean(lineErrors?.qty)}
                      {...form.register(`items.${index}.qty`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t('purchaseForm.unitCost')}
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
                      aria-label={t('purchaseForm.removeLine')}
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
      {lineError && <p className="text-sm text-destructive">{message(lineError)}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button type="button" variant="outline" onClick={() => lines.append(EMPTY_LINE)}>
          <PlusIcon />
          {t('purchaseForm.addLine')}
        </Button>
        <p className="text-lg font-semibold">{t('purchaseForm.total', { total: formatRupiah(total) })}</p>
      </div>

      <FormField
        label={t('purchaseForm.note')}
        htmlFor="note"
        error={errors.note?.message}
        hint={tc('optional')}
        className="max-w-3xl">
        <Input id="note" {...form.register('note')} />
      </FormField>

      <div>
        <Button type="submit" disabled={receive.isPending}>
          {receive.isPending ? tc('saving') : t('purchaseForm.save')}
        </Button>
      </div>
    </form>
  );
}
