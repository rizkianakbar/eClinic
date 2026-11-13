'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRoundIcon } from 'lucide-react';
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
import { resetStaffPasswordAction } from './settings.actions';
import { type StaffPasswordValues, staffPasswordSchema } from './settings.lib';

type SettingsStaffPasswordDialogProps = {
  staffId: string;
  name: string;
};

export function SettingsStaffPasswordDialog(props: SettingsStaffPasswordDialogProps) {
  const t = useTranslations('settings.staffPassword');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);

  const reset = useActionMutation((values: StaffPasswordValues) =>
    resetStaffPasswordAction(props.staffId, values.password),
  );

  const form = useForm<StaffPasswordValues>({
    resolver: zodResolver(staffPasswordSchema),
    defaultValues: { password: '' },
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRoundIcon />
        {t('button')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('button')}</DialogTitle>
          <DialogDescription>{t('description', { name: props.name })}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            reset.mutate(values, {
              onSuccess: () => {
                toast.success(t('done'));
                setOpen(false);
                form.reset();
              },
            }),
          )}>
          <FormField
            label={t('label')}
            htmlFor="new_password"
            error={errors.password?.message}
            hint={tc('minChars', { count: 8 })}>
            <Input
              id="new_password"
              type="text"
              autoComplete="new-password"
              autoFocus
              aria-invalid={Boolean(errors.password)}
              {...form.register('password')}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={reset.isPending}>
              {reset.isPending ? tc('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
