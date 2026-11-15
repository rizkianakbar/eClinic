'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Branch, Role } from '@/lib/auth';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { setBranchAssignmentAction } from './branches.actions';

type StaffRow = { id: string; full_name: string; role: Role; clinic_ids: string[] };

type BranchesStaffProps = {
  staff: StaffRow[];
  /** Columns: the branches I can see (owner: all; admin: their own). */
  branches: Branch[];
  /** Admin: only their own branch's column can change. Owner: every column. */
  editableIds: string[];
};

/**
 * Who works where: staff down, branches across, a checkbox per cell. Owners work everywhere (fixed). A staff
 * member always keeps at least one branch (the database refuses the last one).
 */
export function BranchesStaff(props: BranchesStaffProps) {
  const t = useTranslations();
  const save = useActionMutation(setBranchAssignmentAction);
  // The tick moves at once; it springs back if the database refuses.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('branches.staff.colName')}</TableHead>
          {props.branches.map((branch) => (
            <TableHead key={branch.id} className="text-center">
              {branch.name}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.staff.map((person) => (
          <TableRow key={person.id}>
            <TableCell>
              <span className="flex flex-col">
                <span className="font-medium">{person.full_name}</span>
                <span className="text-xs text-muted-foreground">{t(`roles.${person.role}`)}</span>
              </span>
            </TableCell>
            {props.branches.map((branch) => {
              const key = `${person.id}:${branch.id}`;
              const assigned = pending[key] ?? person.clinic_ids.includes(branch.id);
              const owner = person.role === 'owner';
              const editable = !owner && props.editableIds.includes(branch.id);

              return (
                <TableCell key={branch.id} className="text-center">
                  <input
                    type="checkbox"
                    checked={owner || assigned}
                    disabled={!editable || save.isPending}
                    title={owner ? t('branches.staff.ownerEverywhere') : undefined}
                    aria-label={t('branches.staff.assign', { name: person.full_name, branch: branch.name })}
                    onChange={(event) => {
                      const next = event.target.checked;

                      setPending((current) => ({ ...current, [key]: next }));
                      save.mutate(
                        { profileId: person.id, clinicId: branch.id, assigned: next },
                        {
                          onSettled: () =>
                            setPending((current) => {
                              const { [key]: _, ...rest } = current;

                              return rest;
                            }),
                        },
                      );
                    }}
                    className={cn('size-4 accent-primary', !editable && 'opacity-50')}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
