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
import { formatRupiah } from '@/lib/money';
import { useActionMutation } from '@/lib/query';
import { createPoliAction, updatePoliAction } from './settings.actions';
import { NEW_CONSULTATION, type PoliInput, type PoliValues, poliSchema } from './settings.lib';

type Poli = { id: string; name: string; bpjs_poli_code: string | null; consultation_service_id: string | null };

type ConsultationService = { id: string; name: string; price: number };

type SettingsPoliDialogProps = { consultationServices: ConsultationService[] } & (
  | { mode: 'create' }
  | { mode: 'edit'; poli: Poli }
);

export function SettingsPoliDialog(props: SettingsPoliDialogProps) {
  const t = useTranslations('settings.poliForm');
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
          <DialogTitle>{props.mode === 'create' ? t('add') : t('editTitle', { name: props.poli.name })}</DialogTitle>
        </DialogHeader>
        <PoliForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PoliForm(props: SettingsPoliDialogProps & { onDone: () => void }) {
  const t = useTranslations('settings.poliForm');
  const tc = useTranslations('common');

  const save = useActionMutation((values: PoliValues) =>
    props.mode === 'create' ? createPoliAction(values) : updatePoliAction(props.poli.id, values),
  );

  const form = useForm<PoliInput, unknown, PoliValues>({
    resolver: zodResolver(poliSchema),
    defaultValues:
      props.mode === 'edit'
        ? {
            name: props.poli.name,
            bpjs_poli_code: props.poli.bpjs_poli_code ?? '',
            consultation_service_id: props.poli.consultation_service_id ?? '',
          }
        : {
            name: '',
            bpjs_poli_code: '',
            // A new company has no consultation tariff yet: start with "+ Tarif baru" so the fee is set right here.
            consultation_service_id: props.consultationServices.length === 0 ? NEW_CONSULTATION : '',
            consultation_price: '',
          },
  });

  const { errors } = form.formState;
  const [consultation, poliName] = useWatch({ control: form.control, name: ['consultation_service_id', 'name'] });

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
      <FormField label={t('name')} htmlFor="poli_name" error={errors.name?.message} hint={t('nameHint')}>
        <Input id="poli_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register('name')} />
      </FormField>
      <FormField
        label={t('bpjsCode')}
        htmlFor="bpjs_poli_code"
        error={errors.bpjs_poli_code?.message}
        hint={t('bpjsHint')}>
        <Input id="bpjs_poli_code" aria-invalid={Boolean(errors.bpjs_poli_code)} {...form.register('bpjs_poli_code')} />
      </FormField>
      <FormField
        label={t('consultation')}
        htmlFor="consultation_service_id"
        error={errors.consultation_service_id?.message}
        hint={t('consultationHint')}>
        <NativeSelect id="consultation_service_id" className="w-full" {...form.register('consultation_service_id')}>
          <NativeSelectOption value={NEW_CONSULTATION}>{t('newConsultation')}</NativeSelectOption>
          <NativeSelectOption value="">{t('none')}</NativeSelectOption>
          {props.consultationServices.map((service) => (
            <NativeSelectOption key={service.id} value={service.id}>
              {service.name} · {formatRupiah(service.price)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      {consultation === NEW_CONSULTATION && (
        <FormField
          label={t('consultationPrice')}
          htmlFor="consultation_price"
          error={errors.consultation_price?.message}
          hint={t('consultationPriceHint', { name: poliName?.trim() || t('namePlaceholder') })}
          className="reveal">
          <Input
            id="consultation_price"
            inputMode="numeric"
            placeholder="Rp 50.000"
            aria-invalid={Boolean(errors.consultation_price)}
            {...form.register('consultation_price')}
          />
        </FormField>
      )}
      <DialogFooter>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tc('saving') : tc('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
