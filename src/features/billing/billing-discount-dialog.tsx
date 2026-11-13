'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/money';
import { type ActionResult, useActionMutation } from '@/lib/query';
import { type DiscountInput, type DiscountValues, discountSchema } from './billing.lib';

type BillingDiscountDialogProps = {
  label: string;
  title: string;
  /** Largest allowed discount, integer rupiah. */
  max: number;
  current: { amount: number; reason: string | null };
  action: (values: DiscountValues) => Promise<ActionResult>;
};

/** Discount in rupiah with a mandatory reason; 0 removes it. */
export function BillingDiscountDialog(props: BillingDiscountDialogProps) {
  const t = useTranslations('billing.discount');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const save = useActionMutation(props.action);
  const defaults = { amount: String(props.current.amount), reason: props.current.reason ?? '' };

  const form = useForm<DiscountInput, unknown, DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: defaults,
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(defaults);
      }}>
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
        {props.label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{t('description', { max: formatRupiah(props.max) })}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => {
            if (values.amount > props.max) {
              form.setError('amount', { message: t('tooMuch', { max: formatRupiah(props.max) }) });

              return;
            }

            save.mutate(values, {
              onSuccess: () => {
                toast.success(t('saved'));
                setOpen(false);
              },
            });
          })}>
          <FormField label={t('amount')} htmlFor="discount_amount" error={errors.amount?.message}>
            <Input id="discount_amount" inputMode="numeric" autoFocus {...form.register('amount')} />
          </FormField>
          <FormField label={t('reason')} htmlFor="discount_reason" error={errors.reason?.message}>
            <Input id="discount_reason" placeholder={t('reasonPlaceholder')} {...form.register('reason')} />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? tc('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
