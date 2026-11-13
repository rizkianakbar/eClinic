'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useActionMutation } from '@/lib/query';
import { createScheduleAction, updateScheduleAction } from './schedules.actions';
import { DAY_LABELS } from './schedules.constants';
import { type ScheduleInput, type ScheduleValues, scheduleSchema, toHourMinute } from './schedules.lib';

type Option = { id: string; name: string };

type Schedule = {
  id: string;
  doctor_id: string;
  poli_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  quota: number;
};

type SchedulesDialogProps = { doctors: Option[]; polis: Option[] } & (
  | {
      mode: 'create' /** Preselects this weekday; the trigger becomes a slim "add" row in that day's column. */;
      day?: number;
    }
  | { mode: 'edit'; schedule: Schedule }
);

export function SchedulesDialog(props: SchedulesDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.mode === 'create' && props.day ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-black/12 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-primary">
          <PlusIcon className="size-3.5" aria-hidden />
          Tambah sesi
        </button>
      ) : props.mode === 'create' ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Tambah jadwal
        </Button>
      ) : (
        <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
          Ubah
        </Button>
      )}
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{props.mode === 'create' ? 'Tambah jadwal dokter' : 'Ubah jadwal dokter'}</DialogTitle>
        </DialogHeader>
        <ScheduleForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm(props: SchedulesDialogProps & { onDone: () => void }) {
  const save = useActionMutation((values: ScheduleValues) =>
    props.mode === 'create' ? createScheduleAction(values) : updateScheduleAction(props.schedule.id, values),
  );

  const form = useForm<ScheduleInput, unknown, ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues:
      props.mode === 'edit'
        ? {
            doctor_id: props.schedule.doctor_id,
            poli_id: props.schedule.poli_id,
            days: [String(props.schedule.day_of_week)],
            start_time: toHourMinute(props.schedule.start_time),
            end_time: toHourMinute(props.schedule.end_time),
            quota: props.schedule.quota,
          }
        : {
            doctor_id: '',
            poli_id: '',
            days: props.day ? [String(props.day)] : [],
            start_time: '08:00',
            end_time: '12:00',
            quota: '20',
          },
  });

  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success('Jadwal tersimpan.');
            props.onDone();
          },
        }),
      )}>
      <FormField label="Dokter" htmlFor="doctor_id" error={errors.doctor_id?.message} className="sm:col-span-2">
        <NativeSelect
          id="doctor_id"
          className="w-full"
          aria-invalid={Boolean(errors.doctor_id)}
          {...form.register('doctor_id')}>
          <NativeSelectOption value="">Pilih...</NativeSelectOption>
          {props.doctors.map((doctor) => (
            <NativeSelectOption key={doctor.id} value={doctor.id}>
              {doctor.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      <FormField label="Poli" htmlFor="poli_id" error={errors.poli_id?.message}>
        <NativeSelect
          id="poli_id"
          className="w-full"
          aria-invalid={Boolean(errors.poli_id)}
          {...form.register('poli_id')}>
          <NativeSelectOption value="">Pilih...</NativeSelectOption>
          {props.polis.map((poli) => (
            <NativeSelectOption key={poli.id} value={poli.id}>
              {poli.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      {props.mode === 'create' ? (
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">
            Hari praktik <span className="font-normal text-muted-foreground">(boleh lebih dari satu)</span>
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(DAY_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={value} className="size-4 accent-primary" {...form.register('days')} />
                {label}
              </label>
            ))}
          </div>
          {errors.days && (
            <p className="text-sm text-destructive">{errors.days.message ?? errors.days.root?.message}</p>
          )}
        </fieldset>
      ) : (
        <FormField label="Hari" htmlFor="day" error={errors.days?.message}>
          <NativeSelect id="day" className="w-full" aria-invalid={Boolean(errors.days)} {...form.register('days.0')}>
            {Object.entries(DAY_LABELS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      )}

      <FormField label="Jam mulai" htmlFor="start_time" error={errors.start_time?.message}>
        <Input id="start_time" type="time" aria-invalid={Boolean(errors.start_time)} {...form.register('start_time')} />
      </FormField>

      <FormField label="Jam selesai" htmlFor="end_time" error={errors.end_time?.message}>
        <Input id="end_time" type="time" aria-invalid={Boolean(errors.end_time)} {...form.register('end_time')} />
      </FormField>

      <FormField label="Kuota pasien" htmlFor="quota" error={errors.quota?.message} hint="per hari">
        <Input
          id="quota"
          type="number"
          min={1}
          max={500}
          aria-invalid={Boolean(errors.quota)}
          {...form.register('quota')}
        />
      </FormField>

      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  );
}
