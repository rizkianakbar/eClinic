'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { segmentedGroup, segmentedRadioItem } from '@/components/ui/segmented';
import { SheetBody, SheetClose, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { todayInJakarta } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { SEX_LABELS } from './patients.constants';
import { useCreatePatient, useUpdatePatient } from './patients.hooks';
import { type PatientInput, type PatientValues, patientSchema } from './patients.lib';

const EMPTY: PatientInput = {
  full_name: '',
  nik: '',
  bpjs_number: '',
  birth_date: '',
  sex: '' as PatientInput['sex'],
  phone: '',
  address: '',
};

type PatientFormProps = ({ mode: 'create' } | { mode: 'edit'; patientId: string; defaultValues: PatientInput }) & {
  /** Called after a successful save (the drawer closes itself). */
  onSaved?: () => void;
};

/** Fields and footer; lives inside a drawer (`PatientsSheet`). */
export function PatientForm(props: PatientFormProps) {
  const router = useRouter();
  const create = useCreatePatient();
  const update = useUpdatePatient(props.mode === 'edit' ? props.patientId : '');
  const mutation = props.mode === 'create' ? create : update;

  const form = useForm<PatientInput, unknown, PatientValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: props.mode === 'edit' ? props.defaultValues : EMPTY,
  });

  const { errors } = form.formState;

  function onSubmit(values: PatientValues) {
    if (props.mode === 'create') {
      create.mutate(values, {
        onSuccess: (patient) => {
          toast.success('Pasien baru tersimpan. Daftarkan kunjungannya di sini.');

          props.onSaved?.();
          router.push(`/patients/${patient.id}`);
        },
      });
    } else {
      update.mutate(values, {
        onSuccess: () => {
          toast.success('Data pasien tersimpan.');
          props.onSaved?.();
          router.refresh();
        },
      });
    }
  }

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <SheetBody className="grid content-start gap-x-4 gap-y-5 sm:grid-cols-2">
        <FormField label="Nama lengkap" htmlFor="full_name" error={errors.full_name?.message} className="sm:col-span-2">
          <Input
            id="full_name"
            autoFocus={props.mode === 'create'}
            autoComplete="off"
            aria-invalid={Boolean(errors.full_name)}
            {...form.register('full_name')}
          />
        </FormField>

        <FormField
          label="NIK"
          htmlFor="nik"
          className="sm:col-span-2"
          error={errors.nik?.message}
          hint="16 digit. Kosongkan jika belum ada.">
          <Input
            id="nik"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(errors.nik)}
            {...form.register('nik')}
          />
        </FormField>

        <FormField
          label="Nomor BPJS"
          htmlFor="bpjs_number"
          className="sm:col-span-2"
          error={errors.bpjs_number?.message}
          hint="13 digit, jika pasien BPJS.">
          <Input
            id="bpjs_number"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(errors.bpjs_number)}
            {...form.register('bpjs_number')}
          />
        </FormField>

        <FormField label="Tanggal lahir" htmlFor="birth_date" error={errors.birth_date?.message}>
          <Input
            id="birth_date"
            type="date"
            max={todayInJakarta()}
            aria-invalid={Boolean(errors.birth_date)}
            {...form.register('birth_date')}
          />
        </FormField>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Jenis kelamin</legend>
          <div className={cn(segmentedGroup, 'grid w-full grid-cols-2')}>
            {Object.entries(SEX_LABELS).map(([value, label]) => (
              <label key={value} className={cn(segmentedRadioItem, 'h-9')}>
                <input type="radio" value={value} className="sr-only" {...form.register('sex')} />
                {label}
              </label>
            ))}
          </div>
          {errors.sex && <p className="text-[0.8125rem] text-destructive">{errors.sex.message}</p>}
        </fieldset>

        <FormField
          label="Nomor HP"
          htmlFor="phone"
          error={errors.phone?.message}
          hint="Opsional."
          className="sm:col-span-2">
          <Input
            id="phone"
            type="tel"
            autoComplete="off"
            aria-invalid={Boolean(errors.phone)}
            {...form.register('phone')}
          />
        </FormField>

        <FormField
          label="Alamat"
          htmlFor="address"
          error={errors.address?.message}
          hint="Opsional."
          className="sm:col-span-2">
          <Textarea id="address" rows={2} aria-invalid={Boolean(errors.address)} {...form.register('address')} />
        </FormField>
      </SheetBody>
      <SheetFooter>
        <SheetClose render={<Button type="button" variant="outline" />}>Batal</SheetClose>
        <Button type="submit" disabled={mutation.isPending || (props.mode === 'edit' && !form.formState.isDirty)}>
          {mutation.isPending ? 'Menyimpan…' : props.mode === 'create' ? 'Simpan pasien' : 'Simpan perubahan'}
        </Button>
      </SheetFooter>
    </form>
  );
}
