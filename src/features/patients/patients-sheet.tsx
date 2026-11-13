'use client';

import { PencilIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { PatientInput } from './patients.lib';
import { PatientForm } from './patients-form';

type PatientsSheetProps =
  | { mode: 'create'; trigger?: 'default' | 'compact' | 'link'; onSaved?: () => void }
  | { mode: 'edit'; patientId: string; mrn: string; defaultValues: PatientInput };

/** New patient or edit patient, in a drawer over the current page. */
export function PatientsSheet(props: PatientsSheetProps) {
  const t = useTranslations('patients.sheet');
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    if (props.mode === 'create') props.onSaved?.();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {props.mode === 'create' && props.trigger === 'link' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <UserPlusIcon className="size-4" aria-hidden />
          {t('registerNew')}
        </button>
      ) : props.mode === 'create' ? (
        <Button size={props.trigger === 'compact' ? 'sm' : 'default'} onClick={() => setOpen(true)}>
          <UserPlusIcon />
          {t('new')}
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <PencilIcon />
          {t('edit')}
        </Button>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{props.mode === 'create' ? t('new') : t('editTitle')}</SheetTitle>
          <SheetDescription>
            {props.mode === 'create' ? t('newHint') : t('editHint', { mrn: props.mrn })}
          </SheetDescription>
        </SheetHeader>
        {props.mode === 'create' ? (
          <PatientForm mode="create" onSaved={close} />
        ) : (
          <PatientForm mode="edit" patientId={props.patientId} defaultValues={props.defaultValues} onSaved={close} />
        )}
      </SheetContent>
    </Sheet>
  );
}
