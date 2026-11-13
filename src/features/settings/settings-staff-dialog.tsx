'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Role } from '@/lib/auth';
import { useActionMutation } from '@/lib/query';
import { createStaffAction, updateStaffAction } from './settings.actions';
import {
  assignableRoles,
  type StaffCreateInput,
  type StaffCreateValues,
  type StaffValues,
  staffCreateSchema,
  staffSchema,
} from './settings.lib';

type Staff = {
  id: string;
  full_name: string;
  role: Role;
  nik: string | null;
  sip_number: string | null;
};

type SettingsStaffDialogProps = { actorRole: Role } & (
  | { mode: 'create' }
  | {
      mode: 'edit';
      staff: Staff;
      /** Account access controls (password reset, deactivate) shown under the form. */
      access?: ReactNode;
    }
);

export function SettingsStaffDialog(props: SettingsStaffDialogProps) {
  const t = useTranslations('settings.staffForm');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === 'create' ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          {t('add')}
        </Button>
      ) : (
        <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
          {t('manage')}
        </Button>
      )}
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{props.mode === 'create' ? t('add') : props.staff.full_name}</DialogTitle>
          <DialogDescription>{props.mode === 'create' ? t('createHint') : t('editHint')}</DialogDescription>
        </DialogHeader>
        <StaffForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type StaffFormProps = SettingsStaffDialogProps & { onDone: () => void };

function StaffForm(props: StaffFormProps) {
  const t = useTranslations();
  const isCreate = props.mode === 'create';
  const create = useActionMutation(createStaffAction);

  const update = useActionMutation((values: StaffValues) =>
    updateStaffAction(props.mode === 'edit' ? props.staff.id : '', values),
  );

  const pending = create.isPending || update.isPending;

  // One form type for both modes; edit mode simply has no email/password fields.
  const form = useForm<StaffCreateInput, unknown, StaffCreateValues>({
    resolver: zodResolver(isCreate ? staffCreateSchema : (staffSchema as unknown as typeof staffCreateSchema)),
    defaultValues:
      props.mode === 'edit'
        ? { ...props.staff, nik: props.staff.nik ?? '', sip_number: props.staff.sip_number ?? '' }
        : { full_name: '', email: '', password: '', role: '' as Role, nik: '', sip_number: '' },
  });

  const { errors } = form.formState;
  const role = useWatch({ control: form.control, name: 'role' });

  function onSubmit(values: StaffCreateValues) {
    const onSuccess = () => {
      toast.success(t(isCreate ? 'settings.staffForm.created' : 'settings.staffForm.saved'));
      props.onDone();
    };

    if (isCreate) create.mutate(values, { onSuccess });
    else update.mutate(values, { onSuccess });
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        label={t('settings.staffForm.fullName')}
        htmlFor="full_name"
        error={errors.full_name?.message}
        hint={t('settings.staffForm.fullNameHint')}>
        <Input id="full_name" autoFocus aria-invalid={Boolean(errors.full_name)} {...form.register('full_name')} />
      </FormField>

      <FormField label={t('settings.staffForm.role')} htmlFor="role" error={errors.role?.message}>
        <NativeSelect id="role" className="w-full" aria-invalid={Boolean(errors.role)} {...form.register('role')}>
          <NativeSelectOption value="">{t('settings.staffForm.pick')}</NativeSelectOption>
          {assignableRoles(props.actorRole).map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t(`roles.${value}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      {isCreate && (
        <>
          <FormField
            label={t('settings.staffForm.email')}
            htmlFor="email"
            error={errors.email?.message}
            hint={t('settings.staffForm.emailHint')}>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(errors.email)}
              {...form.register('email')}
            />
          </FormField>
          <FormField
            label={t('settings.staffForm.password')}
            htmlFor="password"
            error={errors.password?.message}
            hint={t('settings.staffForm.passwordHint')}>
            <Input
              id="password"
              type="text"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...form.register('password')}
            />
          </FormField>
        </>
      )}

      {(role === 'doctor' || role === 'nurse' || role === 'pharmacist') && (
        <>
          <FormField
            label={t('settings.staffForm.nik')}
            htmlFor="nik"
            error={errors.nik?.message}
            hint={t('settings.staffForm.nikHint')}>
            <Input id="nik" inputMode="numeric" aria-invalid={Boolean(errors.nik)} {...form.register('nik')} />
          </FormField>
          <FormField
            label={t('settings.staffForm.sip')}
            htmlFor="sip_number"
            error={errors.sip_number?.message}
            hint={t('common.optional')}>
            <Input id="sip_number" aria-invalid={Boolean(errors.sip_number)} {...form.register('sip_number')} />
          </FormField>
        </>
      )}

      {props.mode === 'edit' && props.access && (
        <section className="mt-2 flex flex-col gap-2 border-t pt-5">
          <h3 className="text-sm font-semibold">{t('settings.staffForm.access')}</h3>
          <p className="text-[0.8125rem] text-muted-foreground">{t('settings.staffForm.accessHint')}</p>
          <div className="flex flex-wrap gap-2">{props.access}</div>
        </section>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? t('common.saving') : isCreate ? t('settings.staffForm.create') : t('settings.staffForm.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
