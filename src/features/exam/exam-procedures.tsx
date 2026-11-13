'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { formatRupiah } from '@/lib/money';
import { useActionMutation } from '@/lib/query';
import { addProcedureAction, removeProcedureAction } from './exam.actions';
import { type ProcedureInput, type ProcedureValues, procedureSchema } from './exam.lib';
import type { listProcedureOptions, listProcedures } from './exam.service';
import { ExamConsumables } from './exam-consumables';

type ExamProceduresProps = {
  visitId: string;
  procedures: Awaited<ReturnType<typeof listProcedures>>;
  options: Awaited<ReturnType<typeof listProcedureOptions>>;
  defaultPerformerId: string;
  editable: boolean;
};

/** Procedures done during the visit; billed at the price when added. */
export function ExamProcedures(props: ExamProceduresProps) {
  const remove = useActionMutation(removeProcedureAction);

  return (
    <div className="flex flex-col gap-2">
      {props.procedures.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada tindakan.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border text-sm">
          {props.procedures.map((procedure) => (
            <li key={procedure.id} className="flex items-start gap-3 border-b px-3 py-2.5 last:border-0">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-medium">
                    {procedure.service?.name}
                    {procedure.qty > 1 && (
                      <span className="tabular font-normal text-muted-foreground"> × {procedure.qty}</span>
                    )}
                  </p>
                  <p className="tabular text-[0.8125rem] font-medium">
                    {formatRupiah(procedure.price * procedure.qty)}
                  </p>
                </div>
                <p className="-mt-1.5 text-[0.8125rem] text-muted-foreground">oleh {procedure.performer?.full_name}</p>
                <ExamConsumables
                  procedureId={procedure.id}
                  consumables={procedure.consumables}
                  editable={props.editable}
                />
              </div>
              {props.editable && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Hapus tindakan"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(procedure.id)}>
                  <XIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {props.editable &&
        (props.options.services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada tarif tindakan. Admin bisa menambahkannya di Pengaturan → Tarif layanan.
          </p>
        ) : (
          <ProcedureForm {...props} />
        ))}
    </div>
  );
}

function ProcedureForm(props: ExamProceduresProps) {
  const add = useActionMutation((values: ProcedureValues) => addProcedureAction(props.visitId, values));
  const empty: ProcedureInput = { service_id: '', qty: '1', performed_by: props.defaultPerformerId };

  const form = useForm<ProcedureInput, unknown, ProcedureValues>({
    resolver: zodResolver(procedureSchema),
    defaultValues: empty,
  });

  const { errors } = form.formState;
  const firstError = errors.service_id?.message ?? errors.qty?.message ?? errors.performed_by?.message;

  return (
    <form
      noValidate
      className="flex flex-col gap-1"
      onSubmit={form.handleSubmit((values) => add.mutate(values, { onSuccess: () => form.reset(empty) }))}>
      <div className="flex flex-wrap items-start gap-2">
        <NativeSelect
          aria-label="Tindakan"
          className="min-w-56 flex-1"
          aria-invalid={Boolean(errors.service_id)}
          {...form.register('service_id')}>
          <NativeSelectOption value="">Pilih tindakan...</NativeSelectOption>
          {props.options.services.map((service) => (
            <NativeSelectOption key={service.id} value={service.id}>
              {service.name} · {formatRupiah(service.price)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          className="w-20"
          aria-label="Jumlah"
          inputMode="numeric"
          aria-invalid={Boolean(errors.qty)}
          {...form.register('qty')}
        />
        <NativeSelect aria-label="Pelaksana" className="min-w-40" {...form.register('performed_by')}>
          {props.options.performers.map((performer) => (
            <NativeSelectOption key={performer.id} value={performer.id}>
              {performer.full_name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={add.isPending}>
          <PlusIcon />
          Tambah
        </Button>
      </div>
      {firstError && <p className="text-[0.8125rem] text-destructive">{firstError}</p>}
    </form>
  );
}
