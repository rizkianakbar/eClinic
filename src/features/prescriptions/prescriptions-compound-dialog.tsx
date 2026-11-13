'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useMessage } from '@/i18n/message';
import { useActionMutation } from '@/lib/query';
import { addCompoundAction } from './prescriptions.actions';
import {
  type CompoundFormInput,
  type CompoundValues,
  compoundFormSchema,
  SIGNA_SUGGESTIONS,
} from './prescriptions.lib';
import { PrescriptionsMedicinePicker } from './prescriptions-medicine-picker';

const EMPTY: CompoundFormInput = {
  form: 'puyer',
  quantity: '10',
  signa: '',
  ingredients: [{ medicine: null, qty: '' }],
};

type PrescriptionsCompoundDialogProps = {
  visitId: string;
};

/** Racikan: ingredients with total amounts, divided into N puyer/kapsul. */
export function PrescriptionsCompoundDialog(props: PrescriptionsCompoundDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const message = useMessage();
  const add = useActionMutation((values: CompoundValues) => addCompoundAction(props.visitId, values));

  const form = useForm<CompoundFormInput, unknown, CompoundValues>({
    resolver: zodResolver(compoundFormSchema),
    defaultValues: EMPTY,
  });

  const ingredients = useFieldArray({ control: form.control, name: 'ingredients' });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(EMPTY);
      }}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t('rx.compound.button')}
      </Button>
      <DialogContent variant="drawer" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('rx.compound.title')}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            add.mutate(values, {
              onSuccess: () => {
                toast.success(t('rx.compound.added'));
                setOpen(false);
                form.reset(EMPTY);
              },
            }),
          )}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t('rx.compound.ingredients')}</legend>
            {ingredients.fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Controller
                    control={form.control}
                    name={`ingredients.${index}.medicine`}
                    render={({ field: picker, fieldState }) => (
                      <PrescriptionsMedicinePicker
                        id={`ingredient_${index}`}
                        value={picker.value}
                        onChange={picker.onChange}
                        invalid={Boolean(fieldState.error)}
                      />
                    )}
                  />
                  {errors.ingredients?.[index]?.medicine && (
                    <p className="text-sm text-destructive">
                      {message(errors.ingredients[index]?.medicine?.message ?? '')}
                    </p>
                  )}
                </div>
                <div className="w-24">
                  <Input
                    aria-label={t('rx.editor.qty')}
                    inputMode="numeric"
                    placeholder={t('rx.editor.qty')}
                    aria-invalid={Boolean(errors.ingredients?.[index]?.qty)}
                    {...form.register(`ingredients.${index}.qty`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('rx.compound.removeIngredient')}
                  disabled={ingredients.fields.length === 1}
                  onClick={() => ingredients.remove(index)}>
                  <XIcon />
                </Button>
              </div>
            ))}
            {(errors.ingredients?.root?.message ?? errors.ingredients?.message) && (
              <p className="text-sm text-destructive">
                {message(errors.ingredients?.root?.message ?? errors.ingredients?.message ?? '')}
              </p>
            )}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => ingredients.append({ medicine: null, qty: '' })}>
                <PlusIcon />
                {t('rx.compound.addIngredient')}
              </Button>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t('rx.compound.form')} htmlFor="compound_form" error={errors.form?.message}>
              <NativeSelect id="compound_form" className="w-full" {...form.register('form')}>
                {(['puyer', 'kapsul'] as const).map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {t(`compoundForm.${value}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label={t('rx.compound.divided')} htmlFor="compound_quantity" error={errors.quantity?.message}>
              <Input id="compound_quantity" inputMode="numeric" {...form.register('quantity')} />
            </FormField>
            <FormField label={t('rx.editor.signa')} htmlFor="compound_signa" error={errors.signa?.message}>
              <Input id="compound_signa" list="signa_suggestions" {...form.register('signa')} />
            </FormField>
          </div>
          <datalist id="signa_suggestions">
            {SIGNA_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>

          <DialogFooter>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? t('common.saving') : t('rx.compound.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
