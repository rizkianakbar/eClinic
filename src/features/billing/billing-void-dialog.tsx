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
import { useActionMutation } from '@/lib/query';
import { voidInvoiceAction } from './billing.actions';
import { type VoidValues, voidSchema } from './billing.lib';

type BillingVoidDialogProps = {
  invoiceId: string;
  invoiceNo: string;
};

/** Owner/admin: voids a paid invoice; the visit returns to the cashier for a corrected one. */
export function BillingVoidDialog(props: BillingVoidDialogProps) {
  const t = useTranslations('billing.void');
  const [open, setOpen] = useState(false);
  const voidInvoice = useActionMutation((values: VoidValues) => voidInvoiceAction(props.invoiceId, values));
  const form = useForm<VoidValues>({ resolver: zodResolver(voidSchema), defaultValues: { reason: '' } });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title', { invoiceNo: props.invoiceNo })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            voidInvoice.mutate(values, {
              onSuccess: () => {
                toast.success(t('done'));
                setOpen(false);
              },
            }),
          )}>
          <FormField label={t('reason')} htmlFor="void_reason" error={errors.reason?.message}>
            <Input id="void_reason" autoFocus placeholder={t('reasonPlaceholder')} {...form.register('reason')} />
          </FormField>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={voidInvoice.isPending}>
              {voidInvoice.isPending ? t('voiding') : t('button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
