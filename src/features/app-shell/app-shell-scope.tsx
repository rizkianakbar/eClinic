'use client';

import { CheckIcon, ChevronsUpDownIcon, LayoutGridIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSwitchBranch } from '@/features/branches/branches.hooks';
import type { Branch } from '@/lib/auth';
import { cn } from '@/lib/utils';

type AppShellScopeProps = {
  organizationName: string;
  /** The branch being worked at; null on the company pages (no branch in scope). */
  current: Branch | null;
  branches: Branch[];
  isOwner: boolean;
  /** The organization has several open branches: the branch is always named. */
  multiBranch: boolean;
};

/**
 * Vercel's scope breadcrumb: `Company / Branch ⇅`. The company leads to its overview (owner); the branch opens a
 * switcher with every branch I work at, and for the owner the company overview and "open a branch". A one-branch
 * staff member just sees their clinic's name, as before.
 */
export function AppShellScope(props: AppShellScopeProps) {
  const t = useTranslations('shell.scope');
  const choose = useSwitchBranch();
  const switchable = props.branches.length > 1 || props.isOwner;

  // One branch, no company to manage: the clinic's name, nothing to pick.
  if (!switchable && !props.multiBranch) {
    return (
      <span className="max-w-44 truncate text-sm font-semibold" title={props.current?.name}>
        {props.current?.name ?? props.organizationName}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1">
      {props.isOwner ? (
        <Link
          href="/company"
          className={cn(
            'max-w-40 truncate rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-muted',
            props.current ? 'text-muted-foreground hover:text-foreground' : 'font-semibold',
          )}>
          {props.organizationName}
        </Link>
      ) : (
        <span className="hidden max-w-40 truncate px-1.5 text-sm text-muted-foreground md:block">
          {props.organizationName}
        </span>
      )}
      <Slash />
      {switchable ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('switch')}
            className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold transition-colors hover:bg-muted data-popup-open:bg-muted">
            {props.current ? (
              <>
                <BranchBadge name={props.current.name} active small />
                <span className="max-w-44 truncate">{props.current.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{t('choose')}</span>
            )}
            <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between gap-3 px-2 pt-1 pb-2">
                <span className="truncate">{props.organizationName}</span>
                <span className="tabular shrink-0 font-normal">{t('count', { count: props.branches.length })}</span>
              </DropdownMenuLabel>
              {props.branches.map((branch) => {
                const active = branch.id === props.current?.id;
                const pending = (choose.isPending || choose.isSuccess) && choose.variables === branch.id;

                return (
                  <DropdownMenuItem
                    key={branch.id}
                    disabled={choose.isPending || choose.isSuccess}
                    closeOnClick={false}
                    onClick={() => (active ? undefined : choose.mutate(branch.id))}
                    className={cn('h-auto gap-3 py-2', active && 'bg-secondary/60 data-highlighted:bg-secondary')}>
                    <BranchBadge name={branch.name} active={active} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn('truncate leading-tight', active && 'font-semibold')}>{branch.name}</span>
                      <span className="truncate text-xs leading-tight text-muted-foreground">
                        {branch.address ?? t('noAddress')}
                      </span>
                    </span>
                    {pending ? (
                      <LoaderCircleIcon className="animate-spin" aria-label={t('opening')} />
                    ) : (
                      active && <CheckIcon className="text-primary!" aria-label={t('current')} />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            {props.isOwner && (
              <>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuGroup>
                  <DropdownMenuLinkItem render={<Link href="/company" />} className="h-9">
                    <LayoutGridIcon />
                    {t('overview')}
                  </DropdownMenuLinkItem>
                  <DropdownMenuLinkItem render={<Link href="/company/branches?new=1" />} className="h-9">
                    <PlusIcon />
                    {t('newBranch')}
                  </DropdownMenuLinkItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="flex min-w-0 items-center gap-1.5 px-1.5 text-sm font-semibold">
          {props.current && <BranchBadge name={props.current.name} active small />}
          <span className="max-w-44 truncate">{props.current?.name}</span>
        </span>
      )}
    </span>
  );
}

/** A branch's initials on a small tile (Vercel's project avatar); jade for the branch I am in. */
function BranchBadge(props: { name: string; active: boolean; small?: boolean }) {
  const letters = props.name
    .replace(/^(klinik|cabang)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold',
        props.small ? 'size-5 rounded-md text-[0.5625rem]' : 'size-8 rounded-lg text-[0.6875rem]',
        props.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/70',
      )}>
      {letters || '·'}
    </span>
  );
}

/** The thin diagonal separator from Vercel's breadcrumb. */
export function Slash() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-input" aria-hidden fill="none" stroke="currentColor">
      <path d="M16.88 3.549L7.12 20.451" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
