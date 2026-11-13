'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BanIcon, CheckIcon, Undo2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessage } from '@/i18n/message';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { setNoMedicineAction } from './prescriptions.actions';
import {
  NO_MEDICINE_REASONS,
  type NoMedicineInput,
  type NoMedicineValues,
  noMedicineSchema,
} from './prescriptions.lib';

type PrescriptionsNoMedicineProps = {
  visitId: string;
  /** The recorded decision, or null when the doctor has not decided yet. */
  reason: string | null;
  editable: boolean;
};

/**
 * The other way to complete the Resep step: the doctor states that this visit needs no medicine, and why.
 * Signing requires either a medicine or this decision.
 */
export function PrescriptionsNoMedicine(props: PrescriptionsNoMedicineProps) {
  const t = useTranslations('rx.noMedicine');
  const tc = useTranslations('common');
  const message = useMessage();
  const [open, setOpen] = useState(false);
  const save = useActionMutation((input: NoMedicineInput | null) => setNoMedicineAction(props.visitId, input));

  const form = useForm<NoMedicineInput, unknown, NoMedicineValues>({
    resolver: zodResolver(noMedicineSchema),
    defaultValues: { reason: '' },
  });

  const reason = useWatch({ control: form.control, name: 'reason' });

  if (props.reason) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-secondary/50 px-3 py-2.5 text-sm',
          // Fades in when the doctor just decided; a decision loaded with the page stays still.
          save.isSuccess && 'reveal',
        )}>
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium">{t('title')}</span>
          <span className="text-muted-foreground"> · {props.reason}</span>
        </span>
        {props.editable && (
          <Button size="xs" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>
            <Undo2Icon />
            {t('undo')}
          </Button>
        )}
      </div>
    );
  }

  if (!props.editable) return null;

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => setOpen(true)}>
        <BanIcon />
        {t('title')}
      </Button>
    );
  }

  return (
    <form
      noValidate
      className="reveal flex flex-col gap-2 rounded-lg border border-dashed px-3 py-3"
      onSubmit={form.handleSubmit((values) => save.mutate(values, { onSuccess: () => setOpen(false) }))}>
      <label htmlFor="no_medicine_reason" className="text-sm font-medium">
        {t('because')}
      </label>
      <div className="flex flex-wrap gap-1">
        {NO_MEDICINE_REASONS.map((key) => {
          const option = t(`reasons.${key}`);

          return (
            <button
              key={key}
              type="button"
              className={cn(
                'h-7 rounded-md border px-2 text-xs transition-colors',
                reason === option ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-muted',
              )}
              onClick={() => form.setValue('reason', option, { shouldValidate: true })}>
              {option}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Input
          id="no_medicine_reason"
          autoComplete="off"
          placeholder={t('placeholder')}
          className="min-w-56 flex-1"
          aria-invalid={Boolean(form.formState.errors.reason)}
          {...form.register('reason')}
        />
        <Button type="submit" variant="outline" disabled={save.isPending}>
          {tc('save')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {tc('cancel')}
        </Button>
      </div>
      {form.formState.errors.reason && (
        <p className="text-[0.8125rem] text-destructive">{message(form.formState.errors.reason.message ?? '')}</p>
      )}
    </form>
  );
}
