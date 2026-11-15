'use client';

import { CheckIcon, LoaderCircleIcon, MapPinIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Branch } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useSwitchBranch } from './branches.hooks';

type BranchesPickerProps = {
  branches: Branch[];
  /** The branch already active (when switching), if any. */
  currentId: string | null;
};

/** One large choice per branch: the whole row is the button, the address tells look-alike names apart. */
export function BranchesPicker(props: BranchesPickerProps) {
  const t = useTranslations('branches.picker');
  const choose = useSwitchBranch();

  return (
    <ul className="flex flex-col gap-2.5">
      {props.branches.map((branch, index) => {
        const current = branch.id === props.currentId;
        const pending = (choose.isPending || choose.isSuccess) && choose.variables === branch.id;

        return (
          <li key={branch.id}>
            <button
              type="button"
              // biome-ignore lint/a11y/noAutofocus: choosing a branch is this page's only task, and the front desk works keyboard-first (Enter picks the first, Tab moves on).
              autoFocus={index === 0}
              disabled={choose.isPending || choose.isSuccess}
              onClick={() => choose.mutate(branch.id)}
              className={cn(
                'flex w-full items-center gap-4 rounded-xl border bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgb(20_32_29/0.04)] outline-none transition-[border-color,box-shadow] hover:border-primary/50 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-60',
                current && 'border-primary/40',
              )}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <MapPinIcon className="size-4.5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{branch.name}</span>
                <span className="truncate text-[0.8125rem] text-muted-foreground">
                  {branch.address ?? t('noAddress')}
                </span>
              </span>
              {pending ? (
                <LoaderCircleIcon
                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                  aria-label={t('opening')}
                />
              ) : (
                current && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    <CheckIcon className="size-3.5" aria-hidden />
                    {t('current')}
                  </span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
