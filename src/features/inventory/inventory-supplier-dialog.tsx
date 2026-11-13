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
import { Textarea } from '@/components/ui/textarea';
import { useActionMutation } from '@/lib/query';
import { createSupplierAction, updateSupplierAction } from './inventory.actions';
import { type SupplierInput, type SupplierValues, supplierSchema } from './inventory.lib';

type Supplier = SupplierValues & { id: string };

type InventorySupplierDialogProps = { mode: 'create' } | { mode: 'edit'; supplier: Supplier };

export function InventorySupplierDialog(props: InventorySupplierDialogProps) {
  const t = useTranslations('inventory.supplierForm');
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
            {props.mode === 'create' ? t('add') : t('editTitle', { name: props.supplier.name })}
          </DialogTitle>
        </DialogHeader>
        <SupplierForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SupplierForm(props: InventorySupplierDialogProps & { onDone: () => void }) {
  const t = useTranslations('inventory.supplierForm');
  const tc = useTranslations('common');

  const save = useActionMutation((values: SupplierValues) =>
    props.mode === 'create' ? createSupplierAction(values) : updateSupplierAction(props.supplier.id, values),
  );

  const form = useForm<SupplierInput, unknown, SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues:
      props.mode === 'edit'
        ? { name: props.supplier.name, phone: props.supplier.phone ?? '', address: props.supplier.address ?? '' }
        : { name: '', phone: '', address: '' },
  });

  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success(t('saved'));
            props.onDone();
          },
        }),
      )}>
      <FormField label={t('name')} htmlFor="supplier_name" error={errors.name?.message}>
        <Input id="supplier_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register('name')} />
      </FormField>
      <FormField label={t('phone')} htmlFor="supplier_phone" error={errors.phone?.message} hint={tc('optional')}>
        <Input id="supplier_phone" type="tel" aria-invalid={Boolean(errors.phone)} {...form.register('phone')} />
      </FormField>
      <FormField label={t('address')} htmlFor="supplier_address" error={errors.address?.message} hint={tc('optional')}>
        <Textarea id="supplier_address" rows={2} aria-invalid={Boolean(errors.address)} {...form.register('address')} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tc('saving') : tc('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
