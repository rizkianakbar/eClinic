'use client';

import { ArchiveIcon, ArrowRightIcon, EllipsisIcon, RotateCcwIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setBranchActiveAction } from '@/features/branches/branches.actions';
import { useSwitchBranch } from '@/features/branches/branches.hooks';
import { useActionMutation } from '@/lib/query';

type CompanyBranchActionsProps = {
  id: string;
  name: string;
  isActive: boolean;
  /** The owner works here: open is pointless. */
  isCurrent: boolean;
};

/** An open branch: open it, or delete (archive) it. An archived one: restore. */
export function CompanyBranchActions(props: CompanyBranchActionsProps) {
  const t = useTranslations('company.branches');
  const open = useSwitchBranch();
  const setActive = useActionMutation(setBranchActiveAction);
  const [confirming, setConfirming] = useState(false);

  if (!props.isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={setActive.isPending}
        onClick={() =>
          setActive.mutate(
            { clinicId: props.id, active: true },
            { onSuccess: () => toast.success(t('restored', { name: props.name })) },
          )
        }>
        <RotateCcwIcon />
        {t('restore')}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('actions', { name: props.name })}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted">
          <EllipsisIcon className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          {!props.isCurrent && (
            <DropdownMenuItem disabled={open.isPending || open.isSuccess} onClick={() => open.mutate(props.id)}>
              <ArrowRightIcon />
              {t('open')}
            </DropdownMenuItem>
          )}
          {!props.isCurrent && <DropdownMenuSeparator />}
          <DropdownMenuItem tone="destructive" onClick={() => setConfirming(true)}>
            <ArchiveIcon />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ArchiveDialog {...props} open={confirming} onOpenChange={setConfirming} />
    </>
  );
}

type ArchiveDialogProps = CompanyBranchActionsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** A short, centred confirmation: what happens, what stays, and the branch's name typed to be sure. */
function ArchiveDialog(props: ArchiveDialogProps) {
  const t = useTranslations('company.branches');
  const tc = useTranslations('common');
  const archive = useActionMutation(setBranchActiveAction);
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toLowerCase() === props.name.trim().toLowerCase();

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        props.onOpenChange(next);
        if (!next) setTyped('');
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteTitle', { name: props.name })}</DialogTitle>
          <DialogDescription>{t('deleteBody')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!matches) return;

            archive.mutate(
              { clinicId: props.id, active: false },
              {
                onSuccess: () => {
                  toast.success(t('deleted', { name: props.name }));
                  props.onOpenChange(false);
                },
              },
            );
          }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`confirm-${props.id}`}>{t('typeName', { name: props.name })}</Label>
            <Input
              id={`confirm-${props.id}`}
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || archive.isPending}>
              {archive.isPending ? tc('saving') : t('deleteConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
