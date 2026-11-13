'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FlaskConicalIcon, PillIcon, PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExamDrafts } from '@/features/exam/exam-drafts';
import { useActionMutation } from '@/lib/query';
import { addPrescriptionItemAction, removeCompoundAction, removePrescriptionItemAction } from './prescriptions.actions';
import {
  COMPOUND_FORM_LABELS,
  type PrescriptionItemFormInput,
  type PrescriptionItemValues,
  prescriptionItemFormSchema,
  SIGNA_SUGGESTIONS,
} from './prescriptions.lib';
import type { getPrescription } from './prescriptions.service';
import { PrescriptionsCompoundDialog } from './prescriptions-compound-dialog';
import { PrescriptionsMedicinePicker } from './prescriptions-medicine-picker';
import { PrescriptionsNoMedicine } from './prescriptions-no-medicine';

type Prescription = Awaited<ReturnType<typeof getPrescription>>;

type PrescriptionsEditorProps = {
  visitId: string;
  prescription: Prescription;
  editable: boolean;
  /** "Tidak perlu obat" reason recorded on the visit (null: not decided). */
  noMedicineReason: string | null;
};

const EMPTY: PrescriptionItemFormInput = { medicine: null, qty: '', signa: '' };

export function PrescriptionsEditor(props: PrescriptionsEditorProps) {
  const { items, compounds } = props.prescription;
  const removeItem = useActionMutation(removePrescriptionItemAction);
  const removeCompound = useActionMutation(removeCompoundAction);
  const busy = removeItem.isPending || removeCompound.isPending;

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && compounds.length === 0 ? (
        !props.noMedicineReason && (
          <p className="text-sm text-muted-foreground">
            {props.editable
              ? 'Belum ada obat. Tambahkan obat, atau pilih "Tidak perlu obat" dengan alasannya.'
              : 'Tidak ada resep.'}
          </p>
        )
      ) : (
        <ul className="overflow-hidden rounded-lg border text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b px-3 py-2.5 last:border-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-pharmacy-soft text-status-pharmacy">
                <PillIcon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {item.medicine?.name}
                  <span className="tabular ml-2 font-normal text-muted-foreground">
                    {item.qty} {item.medicine?.unit}
                  </span>
                </p>
                <p className="text-[0.8125rem] text-muted-foreground">{item.signa}</p>
              </div>
              {props.editable && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Hapus obat"
                  disabled={busy}
                  onClick={() => removeItem.mutate(item.id)}>
                  <XIcon />
                </Button>
              )}
            </li>
          ))}
          {compounds.map((compound) => (
            <li key={compound.id} className="flex items-start gap-3 border-b px-3 py-2.5 last:border-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-pharmacy-soft text-status-pharmacy">
                <FlaskConicalIcon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  Racikan {COMPOUND_FORM_LABELS[compound.form as keyof typeof COMPOUND_FORM_LABELS]}
                  <span className="tabular ml-2 font-normal text-muted-foreground">
                    {compound.quantity} {compound.form}
                  </span>
                </p>
                <ul className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                  {compound.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      {ingredient.medicine?.name}, {ingredient.qty} {ingredient.medicine?.unit}
                    </li>
                  ))}
                </ul>
                <p className="text-[0.8125rem] text-muted-foreground">{compound.signa}</p>
              </div>
              {props.editable && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Hapus racikan"
                  disabled={busy}
                  onClick={() => removeCompound.mutate(compound.id)}>
                  <XIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {props.editable && <ItemForm visitId={props.visitId} />}
      {items.length === 0 && compounds.length === 0 && (
        <PrescriptionsNoMedicine visitId={props.visitId} reason={props.noMedicineReason} editable={props.editable} />
      )}
    </div>
  );
}

type ItemFormProps = {
  visitId: string;
};

function ItemForm(props: ItemFormProps) {
  const add = useActionMutation((values: PrescriptionItemValues) => addPrescriptionItemAction(props.visitId, values));

  const form = useForm<PrescriptionItemFormInput, unknown, PrescriptionItemValues>({
    resolver: zodResolver(prescriptionItemFormSchema),
    defaultValues: EMPTY,
  });

  const { errors } = form.formState;
  const firstError = errors.medicine?.message ?? errors.qty?.message ?? errors.signa?.message;
  const drafts = useExamDrafts();
  const [medicine, qty, signa] = useWatch({ control: form.control, name: ['medicine', 'qty', 'signa'] });
  const hasInput = Boolean(medicine) || Boolean(qty?.toString().trim()) || Boolean(signa?.trim());
  const draftLabel = medicine?.name ?? 'Obat';

  // Saves the row as if "Tambah" were pressed; false (with the errors shown) when it is incomplete.
  const commit = useRef<() => Promise<boolean>>(async () => true);

  useLayoutEffect(() => {
    commit.current = () =>
      new Promise<boolean>((resolve) => {
        void form.handleSubmit(
          async (values) => {
            try {
              await add.mutateAsync(values);
              form.reset(EMPTY);
              resolve(true);
            } catch {
              resolve(false);
            }
          },
          () => resolve(false),
        )();
      });
  });

  // A filled-in row counts as a pending medicine: signing adds it instead of leaving it out.
  useEffect(() => {
    drafts.register('prescription-item', hasInput ? { label: draftLabel, commit: () => commit.current() } : null);

    return () => drafts.register('prescription-item', null);
  }, [drafts.register, hasInput, draftLabel]);

  return (
    <form
      noValidate
      className="flex flex-col gap-1"
      onSubmit={form.handleSubmit((values) => add.mutate(values, { onSuccess: () => form.reset(EMPTY) }))}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-56 flex-1">
          <Controller
            control={form.control}
            name="medicine"
            render={({ field, fieldState }) => (
              <PrescriptionsMedicinePicker
                id="rx_medicine"
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            )}
          />
        </div>
        <Input
          className="w-20"
          aria-label="Jumlah"
          placeholder="Jumlah"
          inputMode="numeric"
          aria-invalid={Boolean(errors.qty)}
          {...form.register('qty')}
        />
        <Input
          className="min-w-48 flex-1"
          aria-label="Aturan pakai"
          placeholder="Aturan pakai, contoh: 3 x 1 sesudah makan"
          list="rx_signa_suggestions"
          aria-invalid={Boolean(errors.signa)}
          {...form.register('signa')}
        />
        <Button type="submit" variant="outline" disabled={add.isPending}>
          <PlusIcon />
          Tambah
        </Button>
        <PrescriptionsCompoundDialog visitId={props.visitId} />
      </div>
      <datalist id="rx_signa_suggestions">
        {SIGNA_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      {firstError ? (
        <p className="text-[0.8125rem] text-destructive">{firstError}</p>
      ) : (
        hasInput && (
          <p className="text-[0.8125rem] text-status-waiting">
            Belum masuk resep. Tekan Tambah (atau Enter); kalau lupa, obat ini ditambahkan saat tanda tangan.
          </p>
        )
      )}
    </form>
  );
}
