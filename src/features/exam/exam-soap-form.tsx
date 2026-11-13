'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, CircleIcon, PenLineIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { saveSoapDraftAction, signVisitAction } from './exam.actions';
import { type SoapInput, type SoapValues, soapSchema } from './exam.lib';
import { ExamSoapSheet } from './exam-soap-sheet';

type ExamSoapFormProps = {
  visitId: string;
  defaultValues: SoapInput;
  hasPrimaryDiagnosis: boolean;
  /** Medicines + racikan on the prescription; decides pharmacy or cashier next. */
  prescriptionCount: number;
};

/**
 * Draft until signed. A floating bar keeps the finish line in view: what is
 * done, save draft (Ctrl/⌘+S), and sign. Signing saves the latest text first.
 */
export function ExamSoapForm(props: ExamSoapFormProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const save = useActionMutation((values: SoapValues) => saveSoapDraftAction(props.visitId, values));
  const sign = useActionMutation((values: SoapValues) => signVisitAction(props.visitId, values));

  const form = useForm<SoapInput, unknown, SoapValues>({
    resolver: zodResolver(soapSchema),
    defaultValues: props.defaultValues,
  });

  const { errors, isDirty } = form.formState;
  const values = useWatch({ control: form.control });
  const hasNotes = Object.values(values).some((value) => (value ?? '').trim() !== '');

  const onSave = form.handleSubmit((submitted) =>
    save.mutate(submitted, {
      onSuccess: () => {
        toast.success('Draf tersimpan.');
        form.reset(submitted);
      },
    }),
  );

  const onSign = form.handleSubmit((submitted) =>
    sign.mutate(submitted, {
      onSuccess: (result) => {
        form.reset(submitted);

        toast.success(
          `Rekam medis ditandatangani. Pasien diteruskan ke ${result.status === 'to_pharmacy' ? 'farmasi' : 'kasir'}.`,
        );

        router.push('/queue');
      },
    }),
  );

  // Unsaved notes: warn before the tab closes or reloads. ⌘S / Ctrl+S saves the draft.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) event.preventDefault();
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isDirty, onSave]);

  const nextStation = props.prescriptionCount > 0 ? 'farmasi' : 'kasir';

  return (
    <form noValidate onSubmit={onSave}>
      <ExamSoapSheet
        render={(field) => (
          <>
            <label htmlFor={`soap_${field.name}`} className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold text-foreground">{field.label}</span>
              <span className="text-muted-foreground">{field.hint}</span>
            </label>
            <textarea
              id={`soap_${field.name}`}
              rows={2}
              aria-invalid={Boolean(errors[field.name])}
              className="field-sizing-content min-h-14 w-full resize-none bg-transparent py-1 text-base leading-relaxed outline-none placeholder:text-muted-foreground/60 sm:text-sm"
              placeholder="Tulis di sini…"
              {...form.register(field.name)}
            />
            {errors[field.name] && <p className="text-[0.8125rem] text-destructive">{errors[field.name]?.message}</p>}
          </>
        )}
      />

      {/* Floating finish bar, over the bottom of the working panel. */}
      <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/95 py-2 pr-2 pl-4 shadow-[0_12px_40px_-12px_rgb(15_31_27/0.3),0_0_0_1px_rgb(20_32_29/0.02)] backdrop-blur-md">
          <ol className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
            <Step done={hasNotes} href="#soap">
              Catatan SOAP
            </Step>
            <Step done={props.hasPrimaryDiagnosis} href="#diagnosis">
              Diagnosis utama
            </Step>
            <li className="text-muted-foreground">
              Lanjut ke <span className="font-medium text-foreground">{nextStation}</span>
            </li>
            {isDirty && <li className="font-medium text-status-waiting">Belum disimpan</li>}
          </ol>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={save.isPending || !isDirty}
              title="Simpan draf (Ctrl+S)">
              {save.isPending ? 'Menyimpan…' : 'Simpan draf'}
            </Button>
            <Dialog open={confirming} onOpenChange={setConfirming}>
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={!props.hasPrimaryDiagnosis}
                title={props.hasPrimaryDiagnosis ? undefined : 'Pilih diagnosis utama dulu'}>
                <PenLineIcon />
                Tanda tangani & selesai
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tanda tangani rekam medis?</DialogTitle>
                  <DialogDescription>
                    Catatan SOAP dan diagnosis akan dikunci; koreksi setelahnya lewat amandemen. Pasien diteruskan ke{' '}
                    {nextStation}.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
                  <Button onClick={() => onSign()} disabled={sign.isPending}>
                    {sign.isPending ? 'Menandatangani…' : 'Tanda tangani'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </form>
  );
}

type StepProps = {
  done: boolean;
  href: string;
  children: string;
};

function Step(props: StepProps) {
  return (
    <li>
      <a
        href={props.href}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium transition-colors hover:text-foreground',
          props.done ? 'text-foreground' : 'text-muted-foreground',
        )}>
        {props.done ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
          </span>
        ) : (
          <CircleIcon className="size-4 text-input" aria-hidden />
        )}
        {props.children}
        <span className="sr-only">{props.done ? '(sudah)' : '(belum)'}</span>
      </a>
    </li>
  );
}
