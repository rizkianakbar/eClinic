'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
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
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { createExpenseAction } from './expenses.actions';
import { expenseStyle } from './expenses.constants';
import { EXPENSE_CATEGORIES, type ExpenseInput, type ExpenseValues, expenseSchema } from './expenses.lib';

type ExpensesDialogProps = {
  today: string;
};

export function ExpensesDialog(props: ExpensesDialogProps) {
  const [open, setOpen] = useState(false);
  const create = useActionMutation(createExpenseAction);
  const empty: ExpenseInput = { expense_date: props.today, category: '', description: '', amount: '' };

  const form = useForm<ExpenseInput, unknown, ExpenseValues>({
    resolver: zodResolver(expenseSchema(props.today)),
    defaultValues: empty,
  });

  const chosen = useWatch({ control: form.control, name: 'category' });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(empty);
      }}>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Catat pengeluaran
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>Catat pengeluaran</DialogTitle>
          <DialogDescription>
            Masuk ke laporan laba rugi. Salah catat? Batalkan dengan alasan, tidak dihapus.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit((values) =>
            create.mutate(values, {
              onSuccess: () => {
                toast.success('Pengeluaran tercatat.');
                setOpen(false);
                form.reset(empty);
              },
            }),
          )}>
          <FormField label="Jumlah" htmlFor="expense_amount" error={errors.amount?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                Rp
              </span>
              <Input
                id="expense_amount"
                inputMode="numeric"
                autoFocus
                autoComplete="off"
                className="tabular h-11 pl-9 text-lg font-semibold sm:text-lg"
                {...form.register('amount')}
              />
            </div>
          </FormField>
          <FormField label="Kategori" htmlFor="expense_category" error={errors.category?.message}>
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.map((category) => {
                const style = expenseStyle(category);
                const selected = category === chosen;

                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => form.setValue('category', category, { shouldValidate: true, shouldDirty: true })}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8125rem] font-medium transition-colors',
                      selected ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-muted',
                    )}>
                    <style.icon className="size-3.5" aria-hidden />
                    {category}
                  </button>
                );
              })}
            </div>
            <Input
              id="expense_category"
              placeholder="Atau tulis kategori lain"
              autoComplete="off"
              {...form.register('category')}
            />
          </FormField>
          <FormField label="Tanggal" htmlFor="expense_date" error={errors.expense_date?.message}>
            <Input id="expense_date" type="date" max={props.today} {...form.register('expense_date')} />
          </FormField>
          <FormField
            label="Keterangan"
            htmlFor="expense_description"
            error={errors.description?.message}
            hint="Opsional, contoh: token listrik November">
            <Input id="expense_description" {...form.register('description')} />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Menyimpan…' : 'Simpan pengeluaran'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
