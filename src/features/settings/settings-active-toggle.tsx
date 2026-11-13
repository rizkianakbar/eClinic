'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { type ActionResult, useActionMutation } from '@/lib/query';

type SettingsActiveToggleProps = {
  id: string;
  isActive: boolean;
  /** Server Action, e.g. setPoliActiveAction. */
  action: (id: string, isActive: boolean) => Promise<ActionResult>;
  /** Name shown in the confirmation, e.g. the staff member's name. */
  name: string;
  /** What deactivating means for this record. */
  consequence: string;
  /** "xs" inside dense cards. */
  size?: 'sm' | 'xs';
};

/** Activate directly; deactivate after confirmation. Nothing is ever deleted. */
export function SettingsActiveToggle(props: SettingsActiveToggleProps) {
  const t = useTranslations('settings.toggle');
  const tc = useTranslations('common');
  const [confirming, setConfirming] = useState(false);
  const toggle = useActionMutation((isActive: boolean) => props.action(props.id, isActive));

  function run(isActive: boolean) {
    toggle.mutate(isActive, {
      onSuccess: () => {
        setConfirming(false);
        toast.success(t(isActive ? 'activated' : 'deactivated', { name: props.name }));
      },
    });
  }

  if (!props.isActive) {
    return (
      <Button variant="outline" size={props.size ?? 'sm'} disabled={toggle.isPending} onClick={() => run(true)}>
        {t('activate')}
      </Button>
    );
  }

  return (
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <Button
        variant="ghost"
        size={props.size ?? 'sm'}
        className="text-destructive hover:bg-status-cancelled-soft hover:text-destructive"
        onClick={() => setConfirming(true)}>
        {t('deactivate')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title', { name: props.name })}</DialogTitle>
          <DialogDescription>{t('description', { consequence: props.consequence })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tc('cancel')}</DialogClose>
          <Button variant="destructive" disabled={toggle.isPending} onClick={() => run(false)}>
            {toggle.isPending ? t('processing') : t('deactivate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
