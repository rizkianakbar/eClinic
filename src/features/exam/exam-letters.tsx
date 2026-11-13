'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileTextIcon, PlusIcon, PrinterIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/dates';
import { useActionMutation } from '@/lib/query';
import { createReferralLetterAction, createSickLetterAction } from './exam.actions';
import {
  type ReferralLetterInput,
  type ReferralLetterValues,
  referralLetterSchema,
  restUntil,
  type SickLetterInput,
  type SickLetterValues,
  sickLetterSchema,
} from './exam.lib';
import type { listLetters } from './exam.service';

type ExamLettersProps = {
  visitId: string;
  letters: Awaited<ReturnType<typeof listLetters>>;
  canIssue: boolean;
  today: string;
  /** Prefill for a referral: S/O from the SOAP note and the prescription. */
  referralDefaults: { clinical_summary: string; therapy: string };
};

const printLetter = (id: string) => window.open(`/print/letter/${id}`, '_blank');

export function ExamLetters(props: ExamLettersProps) {
  return (
    <div className="flex flex-col gap-2">
      {props.letters.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada surat untuk kunjungan ini.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border text-sm">
          {props.letters.map((letter) => (
            <li key={letter.id} className="flex items-center gap-3 border-b px-3 py-2.5 last:border-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileTextIcon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{letter.type === 'sick' ? 'Surat keterangan sakit' : 'Surat rujukan'}</p>
                <p className="text-[0.8125rem] text-muted-foreground">
                  {letter.letter_no} ·{' '}
                  {letter.type === 'sick' && letter.rest_from && letter.rest_days
                    ? `istirahat ${letter.rest_days} hari, ${formatDate(letter.rest_from)} – ${formatDate(restUntil(letter.rest_from, letter.rest_days))}`
                    : letter.destination}
                </p>
              </div>
              <Button size="xs" variant="outline" onClick={() => printLetter(letter.id)}>
                <PrinterIcon />
                Cetak
              </Button>
            </li>
          ))}
        </ul>
      )}
      {props.canIssue && (
        <div className="flex flex-wrap gap-2">
          <SickLetterDialog visitId={props.visitId} today={props.today} />
          <ReferralLetterDialog visitId={props.visitId} defaults={props.referralDefaults} />
        </div>
      )}
    </div>
  );
}

type SickLetterDialogProps = { visitId: string; today: string };

function SickLetterDialog(props: SickLetterDialogProps) {
  const [open, setOpen] = useState(false);
  const create = useActionMutation((values: SickLetterValues) => createSickLetterAction(props.visitId, values));
  const empty: SickLetterInput = { rest_from: props.today, rest_days: '1', show_diagnosis: false };

  const form = useForm<SickLetterInput, unknown, SickLetterValues>({
    resolver: zodResolver(sickLetterSchema(props.today)),
    defaultValues: empty,
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(empty);
      }}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Surat sakit
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>Surat keterangan sakit</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            create.mutate(values, {
              onSuccess: (letter) => {
                toast.success('Surat dibuat.');
                setOpen(false);
                printLetter(letter.id);
              },
            }),
          )}>
          <FormField label="Mulai istirahat" htmlFor="rest_from" error={errors.rest_from?.message}>
            <Input id="rest_from" type="date" min={props.today} {...form.register('rest_from')} />
          </FormField>
          <FormField label="Lama istirahat" htmlFor="rest_days" error={errors.rest_days?.message} hint="hari">
            <Input id="rest_days" type="number" min={1} max={30} {...form.register('rest_days')} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-primary" {...form.register('show_diagnosis')} />
            Cantumkan diagnosis utama
            <span className="text-muted-foreground">(surat sering diberikan ke kantor/sekolah)</span>
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Membuat...' : 'Buat & cetak'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ReferralLetterDialogProps = { visitId: string; defaults: ExamLettersProps['referralDefaults'] };

function ReferralLetterDialog(props: ReferralLetterDialogProps) {
  const [open, setOpen] = useState(false);
  const create = useActionMutation((values: ReferralLetterValues) => createReferralLetterAction(props.visitId, values));
  const empty: ReferralLetterInput = { destination: '', specialty: '', reason: '', ...props.defaults };

  const form = useForm<ReferralLetterInput, unknown, ReferralLetterValues>({
    resolver: zodResolver(referralLetterSchema),
    defaultValues: empty,
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(empty);
      }}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Surat rujukan
      </Button>
      <DialogContent variant="drawer" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Surat rujukan</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            create.mutate(values, {
              onSuccess: (letter) => {
                toast.success('Surat rujukan dibuat.');
                setOpen(false);
                printLetter(letter.id);
              },
            }),
          )}>
          <FormField label="Faskes tujuan" htmlFor="destination" error={errors.destination?.message}>
            <Input id="destination" placeholder="contoh: RSUD Kota Depok" {...form.register('destination')} />
          </FormField>
          <FormField
            label="Poli/spesialis tujuan"
            htmlFor="specialty"
            error={errors.specialty?.message}
            hint="opsional">
            <Input id="specialty" placeholder="contoh: Penyakit Dalam" {...form.register('specialty')} />
          </FormField>
          <FormField label="Alasan rujukan" htmlFor="reason" error={errors.reason?.message} className="sm:col-span-2">
            <Textarea id="reason" rows={2} {...form.register('reason')} />
          </FormField>
          <FormField
            label="Anamnesis & pemeriksaan"
            htmlFor="clinical_summary"
            error={errors.clinical_summary?.message}
            className="sm:col-span-2">
            <Textarea id="clinical_summary" rows={3} {...form.register('clinical_summary')} />
          </FormField>
          <FormField
            label="Terapi yang sudah diberikan"
            htmlFor="therapy"
            error={errors.therapy?.message}
            className="sm:col-span-2">
            <Textarea id="therapy" rows={2} {...form.register('therapy')} />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Membuat...' : 'Buat & cetak'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
