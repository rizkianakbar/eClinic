import { MapPinIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Panel } from '@/components/ui/panel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { listOrganizationBranches } from '@/features/branches/branches.service';
import type { AppLocale } from '@/i18n/locales';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { CompanyBranchActions } from './company-branch-actions';

type CompanyBranchesProps = {
  branches: Awaited<ReturnType<typeof listOrganizationBranches>>;
  currentId: string | null;
};

/** Every branch: the open ones, then the archived ones that can be restored. */
export function CompanyBranches(props: CompanyBranchesProps) {
  const t = useTranslations('company.branches');
  const open = props.branches.filter((branch) => branch.is_active);
  const archived = props.branches.filter((branch) => !branch.is_active);

  return (
    <div className="flex flex-col gap-8">
      <BranchTable rows={open} currentId={props.currentId} />
      {archived.length > 0 && (
        <Panel title={t('archived')} count={archived.length} variant="bare">
          <p className="-mt-1 mb-1 text-sm text-muted-foreground">{t('archivedHint')}</p>
          <BranchTable rows={archived} currentId={null} />
        </Panel>
      )}
    </div>
  );
}

function BranchTable(props: { rows: CompanyBranchesProps['branches']; currentId: string | null }) {
  const t = useTranslations('company.branches');
  const locale = useLocale();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('colBranch')}</TableHead>
          <TableHead className="text-right">{t('colStaff')}</TableHead>
          <TableHead>{t('colOpened')}</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">{t('colActions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((branch) => (
          <TableRow key={branch.id} className={cn(!branch.is_active && 'text-muted-foreground')}>
            <TableCell>
              <span className="flex items-center gap-3">
                <MapPinIcon className={cn('size-4 shrink-0', branch.is_active ? 'text-primary' : '')} aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    {branch.name}
                    {branch.id === props.currentId && (
                      <span className="rounded-md bg-secondary px-1.5 text-xs leading-5 font-medium text-secondary-foreground">
                        {t('current')}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[0.8125rem] text-muted-foreground">
                    {branch.address ?? t('noAddress')}
                  </span>
                </span>
              </span>
            </TableCell>
            <TableCell className="tabular text-right">{branch.staff}</TableCell>
            <TableCell>{formatDate(branch.created_at, locale as AppLocale)}</TableCell>
            <TableCell className="text-right">
              <CompanyBranchActions
                id={branch.id}
                name={branch.name}
                isActive={branch.is_active}
                isCurrent={branch.id === props.currentId}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
