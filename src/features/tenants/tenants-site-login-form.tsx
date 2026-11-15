'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useSiteSignIn } from './tenants.hooks';
import { type SiteLoginInput, type SiteLoginValues, siteLoginSchema } from './tenants.lib';

/** Sign-in on the root domain for people who do not remember their clinic's address. */
export function TenantsSiteLoginForm() {
  const t = useTranslations('tenants.login');
  const signIn = useSiteSignIn();

  const form = useForm<SiteLoginInput, unknown, SiteLoginValues>({
    resolver: zodResolver(siteLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const { errors } = form.formState;
  const busy = signIn.isPending || signIn.isSuccess;

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((values) => signIn.mutate(values))}>
      <FormField label={t('email')} htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          autoFocus
          className="h-10"
          aria-invalid={Boolean(errors.email)}
          {...form.register('email')}
        />
      </FormField>
      <FormField label={t('password')} htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-10"
          aria-invalid={Boolean(errors.password)}
          {...form.register('password')}
        />
      </FormField>
      {/* Busy until the clinic's page loads: success navigates to the clinic's own address. */}
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <LoaderCircleIcon className="animate-spin" aria-hidden />}
        {busy ? t('checking') : t('submit')}
      </Button>
    </form>
  );
}
