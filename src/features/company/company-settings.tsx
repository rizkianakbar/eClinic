'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { renameOrganizationAction } from '@/features/branches/branches.actions';
import { type OrganizationInput, type OrganizationValues, organizationSchema } from '@/features/branches/branches.lib';
import { useActionMutation } from '@/lib/query';

type CompanySettingsProps = {
  name: string;
  /** `<slug>.<root domain>`: fixed after signup. */
  address: string;
};

/**
 * The company itself: its name (shown above the branches) and its web address. Billing and a custom domain will be
 * sections of this page.
 */
export function CompanySettings(props: CompanySettingsProps) {
  const t = useTranslations('company.settings');
  const tc = useTranslations('common');
  const save = useActionMutation(renameOrganizationAction);

  const form = useForm<OrganizationInput, unknown, OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: props.name },
  });

  const { errors, isDirty } = form.formState;

  return (
    <section className="flex max-w-2xl flex-col gap-5 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit((values) =>
          save.mutate(values, {
            onSuccess: () => {
              toast.success(t('saved'));
              form.reset(values);
            },
          }),
        )}>
        <FormField label={t('name')} htmlFor="company_name" error={errors.name?.message} hint={t('nameHint')}>
          <Input id="company_name" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
        </FormField>
        <FormField label={t('address')} htmlFor="company_address" hint={t('addressHint')}>
          <Input id="company_address" value={props.address} readOnly className="bg-muted/50" />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || save.isPending}>
            {save.isPending ? tc('saving') : tc('save')}
          </Button>
        </div>
      </form>
    </section>
  );
}
