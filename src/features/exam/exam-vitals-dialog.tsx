'use client';

import { ActivityIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExamVitalsForm } from './exam-vitals-form';

type ExamVitalsDialogProps = {
  visitId: string;
  patientName: string;
  /** "compact" on queue tickets; "default" on the exam page; "lg" as the room card's main action. */
  size?: 'compact' | 'default' | 'lg';
  label?: string;
  /** Filled (the next thing to do) instead of outline. */
  primary?: boolean;
};

/** Nurse triage from the queue board while the patient waits. */
export function ExamVitalsDialog(props: ExamVitalsDialogProps) {
  const t = useTranslations('exam.vitals');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size={props.size === 'lg' ? 'lg' : props.size === 'default' ? 'sm' : 'xs'}
        variant={props.primary || props.size === 'lg' ? 'default' : 'outline'}
        onClick={() => setOpen(true)}>
        <ActivityIcon />
        {props.label ?? (props.size === 'compact' || !props.size ? t('button') : t('record'))}
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{props.patientName}</DialogDescription>
        </DialogHeader>
        <ExamVitalsForm visitId={props.visitId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
