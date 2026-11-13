'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useActionMutation } from '@/lib/query';
import { createMedicineAction, updateMedicineAction } from './inventory.actions';
import { MEDICINE_UNITS, type MedicineInput, type MedicineValues, medicineSchema } from './inventory.lib';

type Medicine = MedicineValues & { id: string };

type InventoryMedicineDialogProps = { mode: 'create' } | { mode: 'edit'; medicine: Medicine };

export function InventoryMedicineDialog(props: InventoryMedicineDialogProps) {
  const t = useTranslations('inventory.medicineForm');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === 'create' ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          {t('add')}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {tc('edit')}
        </Button>
      )}
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>
            {props.mode === 'create' ? t('add') : t('editTitle', { name: props.medicine.name })}
          </DialogTitle>
        </DialogHeader>
        <MedicineForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MedicineForm(props: InventoryMedicineDialogProps & { onDone: () => void }) {
  const t = useTranslations('inventory.medicineForm');
  const tc = useTranslations('common');

  const save = useActionMutation((values: MedicineValues) =>
    props.mode === 'create' ? createMedicineAction(values) : updateMedicineAction(props.medicine.id, values),
  );

  const form = useForm<MedicineInput, unknown, MedicineValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues:
      props.mode === 'edit'
        ? { ...props.medicine, kfa_code: props.medicine.kfa_code ?? '' }
        : { name: '', unit: '', price: '', kfa_code: '', min_stock: '0' },
  });

  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success(t('saved'));
            props.onDone();
          },
        }),
      )}>
      <FormField
        label={t('name')}
        htmlFor="medicine_name"
        error={errors.name?.message}
        hint={t('nameHint')}
        className="sm:col-span-2">
        <Input id="medicine_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register('name')} />
      </FormField>
      <FormField label={t('unit')} htmlFor="medicine_unit" error={errors.unit?.message}>
        <Input
          id="medicine_unit"
          list="medicine_units"
          aria-invalid={Boolean(errors.unit)}
          {...form.register('unit')}
        />
        <datalist id="medicine_units">
          {MEDICINE_UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </FormField>
      <FormField label={t('price')} htmlFor="medicine_price" error={errors.price?.message} hint={t('priceHint')}>
        <Input
          id="medicine_price"
          inputMode="numeric"
          aria-invalid={Boolean(errors.price)}
          {...form.register('price')}
        />
      </FormField>
      <FormField label={t('minStock')} htmlFor="medicine_min_stock" error={errors.min_stock?.message}>
        <Input
          id="medicine_min_stock"
          type="number"
          min={0}
          aria-invalid={Boolean(errors.min_stock)}
          {...form.register('min_stock')}
        />
      </FormField>
      <FormField label={t('kfa')} htmlFor="medicine_kfa" error={errors.kfa_code?.message} hint={t('kfaHint')}>
        <Input id="medicine_kfa" aria-invalid={Boolean(errors.kfa_code)} {...form.register('kfa_code')} />
      </FormField>
      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tc('saving') : tc('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
