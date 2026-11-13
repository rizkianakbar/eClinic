'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/dates';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { postStockOpnameAction } from './inventory.actions';
import { type OpnameFormInput, type OpnameValues, opnameFormSchema } from './inventory.lib';
import type { listOpnameBatches } from './inventory.service';

type InventoryOpnameFormProps = {
  batches: Awaited<ReturnType<typeof listOpnameBatches>>;
  today: string;
};

/** Type the physical count for the batches you checked; blank rows are not part of the opname. */
export function InventoryOpnameForm(props: InventoryOpnameFormProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const post = useActionMutation(postStockOpnameAction);

  const form = useForm<OpnameFormInput, unknown, OpnameValues>({
    resolver: zodResolver(opnameFormSchema),
    defaultValues: {
      note: '',
      rows: props.batches.map((batch) => ({
        batch_id: batch.id,
        system_qty: batch.qty_on_hand,
        counted: '',
        reason: '',
      })),
    },
  });

  const rows = useWatch({ control: form.control, name: 'rows' });
  const { errors } = form.formState;
  const needle = filter.trim().toLowerCase();

  if (props.batches.length === 0) {
    return <p className="rounded-lg border p-4 text-sm text-muted-foreground">Tidak ada batch dengan stok.</p>;
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        post.mutate(values, {
          onSuccess: (opname) => {
            toast.success('Stok opname disimpan. Stok sudah disesuaikan.');
            router.push(`/inventory/opname/${opname.id}`);
          },
        }),
      )}>
      <Input
        type="search"
        aria-label="Saring obat"
        placeholder="Saring nama obat"
        className="max-w-sm"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Obat</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Kedaluwarsa</TableHead>
            <TableHead className="text-right">Sistem</TableHead>
            <TableHead className="w-24">Fisik</TableHead>
            <TableHead>Selisih</TableHead>
            <TableHead className="min-w-48">Alasan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.batches.map((batch, index) => {
            const counted = rows[index]?.counted ?? '';
            const difference = /^\d+$/.test(counted) ? Number(counted) - batch.qty_on_hand : null;
            const hidden = needle !== '' && !(batch.medicine?.name ?? '').toLowerCase().includes(needle);

            return (
              <TableRow key={batch.id} className={cn(hidden && 'hidden')}>
                <TableCell className="font-medium">{batch.medicine?.name}</TableCell>
                <TableCell className="tabular">{batch.batch_no}</TableCell>
                <TableCell className={cn(batch.expiry_date <= props.today && 'font-medium text-destructive')}>
                  {formatDate(batch.expiry_date)}
                </TableCell>
                <TableCell className="text-right">
                  {batch.qty_on_hand} {batch.medicine?.unit}
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={`Jumlah fisik ${batch.medicine?.name} ${batch.batch_no}`}
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.rows?.[index]?.counted)}
                    {...form.register(`rows.${index}.counted`)}
                  />
                </TableCell>
                <TableCell className={cn(difference !== null && difference !== 0 && 'font-medium text-destructive')}>
                  {difference === null ? '' : difference > 0 ? `+${difference}` : difference}
                </TableCell>
                <TableCell>
                  {difference !== null && difference !== 0 && (
                    <Input
                      aria-label="Alasan selisih"
                      placeholder="contoh: kedaluwarsa, rusak, hilang"
                      aria-invalid={Boolean(errors.rows?.[index]?.reason)}
                      {...form.register(`rows.${index}.reason`)}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {(errors.rows?.root?.message ?? errors.rows?.message) && (
        <p className="text-sm text-destructive">{errors.rows?.root?.message ?? errors.rows?.message}</p>
      )}
      {Array.isArray(errors.rows) && errors.rows.some(Boolean) && (
        <p className="text-sm text-destructive">Periksa baris yang ditandai merah.</p>
      )}
      <FormField
        label="Catatan"
        htmlFor="opname_note"
        error={errors.note?.message}
        hint="opsional"
        className="max-w-xl">
        <Input id="opname_note" {...form.register('note')} />
      </FormField>
      <div>
        <Button type="submit" disabled={post.isPending}>
          {post.isPending ? 'Menyimpan...' : 'Simpan stok opname'}
        </Button>
      </div>
    </form>
  );
}
