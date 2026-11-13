'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useActionMutation } from '@/lib/query';
import { changePasswordAction } from './auth.actions';
import { type ChangePasswordValues, changePasswordSchema } from './auth.lib';

const EMPTY: ChangePasswordValues = { current_password: '', password: '', confirm: '' };

export function AuthChangePasswordForm() {
  const t = useTranslations('auth.password');
  const tc = useTranslations('common');
  const change = useActionMutation(changePasswordAction);
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        change.mutate(values, {
          onSuccess: () => {
            toast.success(t('changed'));
            form.reset(EMPTY);
          },
        }),
      )}>
      <FormField label={t('current')} htmlFor="current_password" error={errors.current_password?.message}>
        <Input
          id="current_password"
          type="password"
          autoComplete="current-password"
          {...form.register('current_password')}
        />
      </FormField>
      <FormField label={t('new')} htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <FormField label={t('confirm')} htmlFor="confirm" error={errors.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" {...form.register('confirm')} />
      </FormField>
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? tc('saving') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
