'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useActionMutation } from '@/lib/query';
import { addVitalsAction } from './exam.actions';
import { type VitalsInput, type VitalsValues, vitalsSchema } from './exam.lib';

/** Fields (labels: exam.vitals.field.<name>); 'perMinute' is worded per language. */
const FIELDS = [
  { name: 'systolic', unit: 'mmHg' },
  { name: 'diastolic', unit: 'mmHg' },
  { name: 'pulse', unit: 'perMinute' },
  { name: 'temperature', unit: '°C' },
  { name: 'respiratory_rate', unit: 'perMinute' },
  { name: 'spo2', unit: '%' },
  { name: 'weight', unit: 'kg' },
  { name: 'height', unit: 'cm' },
] as const;

const EMPTY: VitalsInput = Object.fromEntries(FIELDS.map((field) => [field.name, ''])) as VitalsInput;

type ExamVitalsFormProps = {
  visitId: string;
  onDone?: () => void;
};

export function ExamVitalsForm(props: ExamVitalsFormProps) {
  const t = useTranslations();
  const save = useActionMutation((values: VitalsValues) => addVitalsAction(props.visitId, values));

  const form = useForm<VitalsInput, unknown, VitalsValues>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: EMPTY,
  });

  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success(t('exam.vitals.saved'));
            form.reset(EMPTY);
            props.onDone?.();
          },
        }),
      )}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {FIELDS.map((field) => (
          <FormField
            key={field.name}
            label={t(`exam.vitals.field.${field.name}`)}
            htmlFor={`vital_${field.name}`}
            error={errors[field.name]?.message}>
            <div className="relative">
              <Input
                id={`vital_${field.name}`}
                inputMode="decimal"
                autoComplete="off"
                className="pr-14"
                aria-invalid={Boolean(errors[field.name])}
                {...form.register(field.name)}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                {field.unit === 'perMinute' ? t('exam.vitals.unit.perMinute') : field.unit}
              </span>
            </div>
          </FormField>
        ))}
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">{t('exam.vitals.formHint')}</p>
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t('common.saving') : t('exam.vitals.save')}
        </Button>
      </div>
    </form>
  );
}
