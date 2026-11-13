'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useActionMutation } from '@/lib/query';
import { createServiceAction, updateServiceAction } from './billing.actions';
import { type ServiceInput, type ServiceValues, serviceSchema } from './billing.lib';

type Service = ServiceValues & { id: string };

type BillingServiceDialogProps = { mode: 'create' } | { mode: 'edit'; service: Service };

export function BillingServiceDialog(props: BillingServiceDialogProps) {
  const t = useTranslations('billing.services');
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
          <DialogTitle>{props.mode === 'create' ? t('add') : t('editTitle', { name: props.service.name })}</DialogTitle>
        </DialogHeader>
        <ServiceForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

const SERVICE_TYPES = ['consultation', 'procedure', 'other', 'package'] as const;
const FEE_TYPES = ['none', 'fixed', 'percent'] as const;

function ServiceForm(props: BillingServiceDialogProps & { onDone: () => void }) {
  const t = useTranslations('billing');
  const tc = useTranslations('common');

  const save = useActionMutation((values: ServiceValues) =>
    props.mode === 'create' ? createServiceAction(values) : updateServiceAction(props.service.id, values),
  );

  const form = useForm<ServiceInput, unknown, ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues:
      props.mode === 'edit'
        ? { ...props.service }
        : { name: '', type: 'consultation', price: '', doctor_fee_type: 'none', doctor_fee_value: '' },
  });

  const { errors } = form.formState;
  const feeType = useWatch({ control: form.control, name: 'doctor_fee_type' });

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success(t('services.saved'));
            props.onDone();
          },
        }),
      )}>
      <FormField
        label={t('services.name')}
        htmlFor="service_name"
        error={errors.name?.message}
        className="sm:col-span-2">
        <Input id="service_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register('name')} />
      </FormField>
      <FormField label={t('services.type')} htmlFor="service_type" error={errors.type?.message}>
        <NativeSelect id="service_type" className="w-full" {...form.register('type')}>
          {SERVICE_TYPES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t(`serviceType.${value}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label={t('services.price')} htmlFor="service_price" error={errors.price?.message}>
        <Input
          id="service_price"
          inputMode="numeric"
          aria-invalid={Boolean(errors.price)}
          {...form.register('price')}
        />
      </FormField>
      <FormField label={t('services.doctorFee')} htmlFor="service_fee_type" error={errors.doctor_fee_type?.message}>
        <NativeSelect id="service_fee_type" className="w-full" {...form.register('doctor_fee_type')}>
          {FEE_TYPES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t(`feeType.${value}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      {feeType !== 'none' && (
        <FormField
          label={feeType === 'percent' ? t('services.percent') : t('services.amount')}
          htmlFor="service_fee_value"
          hint={feeType === 'percent' ? t('services.percentHint') : t('services.rupiahHint')}
          error={errors.doctor_fee_value?.message}>
          <Input
            id="service_fee_value"
            inputMode="numeric"
            aria-invalid={Boolean(errors.doctor_fee_value)}
            {...form.register('doctor_fee_value')}
          />
        </FormField>
      )}
      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tc('saving') : tc('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
