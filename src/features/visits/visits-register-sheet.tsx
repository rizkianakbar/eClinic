'use client';

import { CalendarPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PracticeSession } from './visits.lib';
import { VisitsRegisterForm } from './visits-register-form';

type VisitsRegisterSheetProps = {
  patientId: string;
  patientName: string;
  hasBpjsNumber: boolean;
  sessions: PracticeSession[];
  canManageSchedules: boolean;
  now: string;
};

/** Register today's visit from the patient's page, in a drawer. */
export function VisitsRegisterSheet(props: VisitsRegisterSheetProps) {
  const t = useTranslations('visits.register');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <CalendarPlusIcon />
        {t('button')}
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{t('button')}</DialogTitle>
          <DialogDescription>{t('today', { name: props.patientName })}</DialogDescription>
        </DialogHeader>
        <VisitsRegisterForm
          patientId={props.patientId}
          hasBpjsNumber={props.hasBpjsNumber}
          sessions={props.sessions}
          canManageSchedules={props.canManageSchedules}
          now={props.now}
          layout="panel"
          onRegistered={(visit) => {
            setOpen(false);

            toast.success(t('queueNumber', { number: visit.queueNo }), {
              description: `${visit.session.poliName} · ${visit.session.doctorName}`,
              duration: 10_000,
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
