'use client';

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
  const [confirming, setConfirming] = useState(false);
  const toggle = useActionMutation((isActive: boolean) => props.action(props.id, isActive));

  function run(isActive: boolean) {
    toggle.mutate(isActive, {
      onSuccess: () => {
        setConfirming(false);
        toast.success(isActive ? `${props.name} diaktifkan.` : `${props.name} dinonaktifkan.`);
      },
    });
  }

  if (!props.isActive) {
    return (
      <Button variant="outline" size={props.size ?? 'sm'} disabled={toggle.isPending} onClick={() => run(true)}>
        Aktifkan
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
        Nonaktifkan
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nonaktifkan {props.name}?</DialogTitle>
          <DialogDescription>{props.consequence} Data lama tetap tersimpan dan bisa diaktifkan lagi.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button variant="destructive" disabled={toggle.isPending} onClick={() => run(false)}>
            {toggle.isPending ? 'Memproses...' : 'Nonaktifkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
