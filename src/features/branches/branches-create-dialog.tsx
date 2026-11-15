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
import { createBranchAction } from './branches.actions';
import { type BranchCreateInput, type BranchCreateValues, branchCreateSchema } from './branches.lib';

type BranchesCreateDialogProps = {
  /** Open on first render (the switcher's "Buka cabang baru" lands here with ?new=1). */
  defaultOpen?: boolean;
};

/**
 * The owner opens a branch: its name and where it is. The company's polis, tariffs, medicines and suppliers are
 * there at once; stock starts empty.
 */
export function BranchesCreateDialog(props: BranchesCreateDialogProps) {
  const t = useTranslations('branches.create');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const create = useActionMutation(createBranchAction);

  const form = useForm<BranchCreateInput, unknown, BranchCreateValues>({
    resolver: zodResolver(branchCreateSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        {t('open')}
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            create.mutate(values, {
              onSuccess: () => {
                toast.success(t('created', { name: values.name }));
                setOpen(false);
                form.reset();
              },
            }),
          )}>
          <FormField label={t('name')} htmlFor="branch_name" error={errors.name?.message} hint={t('nameHint')}>
            <Input id="branch_name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register('name')} />
          </FormField>
          <FormField
            label={t('address')}
            htmlFor="branch_address"
            error={errors.address?.message}
            hint={t('addressHint')}>
            <Input id="branch_address" aria-invalid={Boolean(errors.address)} {...form.register('address')} />
          </FormField>
          <FormField label={t('phone')} htmlFor="branch_phone" error={errors.phone?.message}>
            <Input
              id="branch_phone"
              type="tel"
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
              {...form.register('phone')}
            />
          </FormField>
          <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-[0.8125rem] text-muted-foreground">{t('shared')}</p>
          <p className="text-[0.8125rem] text-muted-foreground">{t('after')}</p>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? tc('saving') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
