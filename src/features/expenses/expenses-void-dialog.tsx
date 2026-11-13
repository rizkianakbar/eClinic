'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { voidExpenseAction } from './expenses.actions';
import { type VoidExpenseValues, voidExpenseSchema } from './expenses.lib';

type ExpensesVoidDialogProps = {
  expenseId: string;
  label: string;
};

export function ExpensesVoidDialog(props: ExpensesVoidDialogProps) {
  const [open, setOpen] = useState(false);
  const voidExpense = useActionMutation((values: VoidExpenseValues) => voidExpenseAction(props.expenseId, values));
  const form = useForm<VoidExpenseValues>({ resolver: zodResolver(voidExpenseSchema), defaultValues: { reason: '' } });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Batalkan
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan pengeluaran?</DialogTitle>
          <DialogDescription>{props.label}. Data tidak dihapus; ditandai batal dengan alasan ini.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            voidExpense.mutate(values, {
              onSuccess: () => {
                toast.success('Pengeluaran dibatalkan.');
                setOpen(false);
              },
            }),
          )}>
          <FormField label="Alasan" htmlFor="expense_void_reason" error={errors.reason?.message}>
            <Input id="expense_void_reason" autoFocus {...form.register('reason')} />
          </FormField>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={voidExpense.isPending}>
              Batalkan pengeluaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
