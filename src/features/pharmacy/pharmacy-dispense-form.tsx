'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BoxesIcon,
  FlaskConicalIcon,
  PackageCheckIcon,
  PillIcon,
  PrinterIcon,
  ReceiptIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { dispenseAction } from './pharmacy.actions';
import {
  type BatchPick,
  DEFAULT_SHORT_REASON,
  type DispenseInput,
  type DispenseValues,
  dispenseSchema,
} from './pharmacy.lib';

export type DispenseLine = {
  id: string;
  /** e.g. "Racikan puyer · 10 puyer · 3 x 1" for ingredients, else null. */
  group: string | null;
  name: string;
  qty: number;
  unit: string;
  signa: string | null;
  available: number;
  short: boolean;
  /** Sale price per unit (what the cashier will charge). */
  price: number;
  /** Batches this line will be taken from (earliest expiry first). */
  picks: BatchPick[];
};

type PharmacyDispenseFormProps = {
  visitId: string;
  lines: DispenseLine[];
  bpjs: boolean;
  /** Batches expiring on or before this date are flagged. */
  nearExpiryCutoff: string;
};

const QUICK_REASONS = ['Stok habis', 'Pasien menolak', 'Beli di luar', 'Sudah punya di rumah'];

/**
 * The dispensing bench: every medicine with the batch it will come from,
 * short items pre-marked "not given" (the pharmacist confirms), and a running
 * summary of what is handed over and charged.
 */
export function PharmacyDispenseForm(props: PharmacyDispenseFormProps) {
  const submit = useActionMutation((values: DispenseValues) => dispenseAction(props.visitId, values));

  const form = useForm<DispenseInput, unknown, DispenseValues>({
    resolver: zodResolver(dispenseSchema),
    defaultValues: {
      items: props.lines.map((line) => ({
        prescription_item_id: line.id,
        not_given: line.short,
        reason: line.short ? DEFAULT_SHORT_REASON : '',
      })),
    },
  });

  const fields = useFieldArray({ control: form.control, name: 'items' });
  const values = useWatch({ control: form.control, name: 'items' });
  const { errors } = form.formState;

  const given = props.lines.filter((_, index) => !values[index]?.not_given);
  const total = given.reduce((sum, line) => sum + line.price * line.qty, 0);
  const notGivenCount = props.lines.length - given.length;
  const groups = [...new Set(props.lines.map((line) => line.group))];

  function row(index: number) {
    const line = props.lines[index];
    const field = fields.fields[index];
    const notGiven = Boolean(values[index]?.not_given);
    const reasonError = errors.items?.[index]?.reason?.message;

    return (
      <li key={field.id} className={cn('flex flex-col gap-3 px-4 py-4 transition-colors', notGiven && 'bg-muted/50')}>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              notGiven ? 'bg-muted text-muted-foreground' : 'bg-status-pharmacy-soft text-status-pharmacy',
            )}>
            <PillIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={cn('font-semibold', notGiven && 'text-muted-foreground line-through decoration-1')}>
                {line.name}
              </p>
              <p
                className={cn(
                  'tabular text-[1.0625rem] font-semibold tracking-tight',
                  notGiven && 'text-muted-foreground',
                )}>
                {line.qty} <span className="text-sm font-normal text-muted-foreground">{line.unit}</span>
              </p>
            </div>
            {line.signa && (
              <p className="mt-1 inline-flex rounded-md bg-secondary px-2 py-0.5 text-[0.8125rem] font-medium text-secondary-foreground">
                {line.signa}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem]">
              {line.short ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-status-cancelled">
                  <TriangleAlertIcon className="size-3.5" aria-hidden />
                  Stok kurang: ada {line.available} {line.unit}, perlu {line.qty}
                </span>
              ) : (
                line.picks.map((pick) => {
                  const near = pick.expiry <= props.nearExpiryCutoff;

                  return (
                    <span key={pick.batchNo} className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <BoxesIcon className="size-3.5" aria-hidden />
                      Batch <span className="tabular font-medium text-foreground">{pick.batchNo}</span>
                      <span
                        className={cn(
                          'tabular',
                          near && 'rounded bg-status-waiting-soft px-1 font-medium text-status-waiting',
                        )}>
                        ED {formatDate(pick.expiry)}
                      </span>
                      {line.picks.length > 1 && <span className="tabular">× {pick.qty}</span>}
                    </span>
                  );
                })
              )}
              {!line.short && (
                <span className="tabular text-muted-foreground">
                  · stok {line.available} {line.unit}
                </span>
              )}
              {!props.bpjs && line.price > 0 && (
                <span className="tabular ml-auto text-muted-foreground">{formatRupiah(line.price * line.qty)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-13">
          <label
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-[0.8125rem] font-medium transition-colors select-none has-focus-visible:ring-3 has-focus-visible:ring-primary/20',
              notGiven
                ? 'border-status-cancelled/40 bg-status-cancelled-soft text-status-cancelled'
                : 'bg-card text-muted-foreground hover:text-foreground',
            )}>
            <input type="checkbox" className="sr-only" {...form.register(`items.${index}.not_given`)} />
            {notGiven ? <Undo2Icon className="size-3.5" aria-hidden /> : null}
            {notGiven ? 'Tidak diberikan · batalkan' : 'Tandai tidak diberikan'}
          </label>
          {notGiven && (
            <>
              <Input
                className="h-8 max-w-xs flex-1"
                aria-label="Alasan tidak diberikan"
                placeholder="Alasan"
                aria-invalid={Boolean(reasonError)}
                {...form.register(`items.${index}.reason`)}
              />
              <div className="flex flex-wrap gap-1">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={cn(
                      'h-7 rounded-md border px-2 text-xs transition-colors',
                      values[index]?.reason === reason
                        ? 'border-foreground bg-foreground text-background'
                        : 'bg-card hover:bg-muted',
                    )}
                    onClick={() => form.setValue(`items.${index}.reason`, reason, { shouldValidate: true })}>
                    {reason}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {reasonError && <p className="pl-13 text-[0.8125rem] text-destructive">{reasonError}</p>}
      </li>
    );
  }

  return (
    <form
      noValidate
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={form.handleSubmit((data) =>
        submit.mutate(data, {
          onSuccess: () => toast.success('Obat diserahkan. Etiket siap dicetak; pasien diteruskan ke kasir.'),
        }),
      )}>
      <div className="flex min-w-0 flex-col gap-4">
        {groups.map((group) => {
          const indexes = props.lines.flatMap((line, index) => (line.group === group ? [index] : []));
          const [title, ...rest] = (group ?? '').split(' · ');

          return (
            <section
              key={group ?? 'regular'}
              className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
              <header className="flex items-center gap-3 border-b px-4 py-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-status-pharmacy-soft text-status-pharmacy">
                  {group ? (
                    <FlaskConicalIcon className="size-4" aria-hidden />
                  ) : (
                    <PillIcon className="size-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[0.9375rem] font-semibold">{group ? title : 'Obat jadi'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {group
                      ? `${rest.join(' · ')} · ${indexes.length} bahan, diracik lalu dibagi`
                      : `${indexes.length} obat, diserahkan apa adanya`}
                  </p>
                </div>
              </header>
              <ol className="divide-y">{indexes.map(row)}</ol>
            </section>
          );
        })}
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-19">
        <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <h2 className="mb-3 text-sm font-semibold">Ringkasan</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Diserahkan</dt>
              <dd className="tabular font-medium">
                {given.length} dari {props.lines.length} obat
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tidak diberikan</dt>
              <dd className={cn('tabular font-medium', notGivenCount > 0 && 'text-status-cancelled')}>
                {notGivenCount}
              </dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t pt-3">
              <dt className="text-muted-foreground">{props.bpjs ? 'Biaya obat' : 'Perkiraan tagihan obat'}</dt>
              <dd className="numeral text-[1.25rem]">{props.bpjs ? 'BPJS' : formatRupiah(total)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={submit.isPending}>
            <PackageCheckIcon />
            {submit.isPending
              ? 'Menyerahkan…'
              : given.length === 0
                ? 'Selesai tanpa obat'
                : `Serahkan ${given.length} obat`}
          </Button>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <h2 className="mb-3 text-sm font-semibold">Setelah diserahkan</h2>
          <ol className="flex flex-col gap-3 text-[0.8125rem]">
            {[
              { icon: BoxesIcon, text: 'Stok dipotong dari batch yang tertera (kedaluwarsa terdekat dulu).' },
              { icon: PrinterIcon, text: 'Etiket tiap obat dan racikan siap dicetak di printer thermal.' },
              {
                icon: ReceiptIcon,
                text: props.bpjs
                  ? 'Pasien diteruskan ke kasir untuk diselesaikan (BPJS, tanpa bayar).'
                  : 'Pasien diteruskan ke kasir; obat yang tidak diberikan tidak ditagih.',
              },
            ].map((step) => (
              <li key={step.text} className="flex gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <step.icon className="size-3.5" aria-hidden />
                </span>
                <span className="text-muted-foreground">{step.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </form>
  );
}
