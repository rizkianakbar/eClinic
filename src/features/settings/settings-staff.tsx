import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { initials } from '@/features/patients/patients.lib';
import type { Role, Session } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { setStaffActiveAction } from './settings.actions';
import type { listStaff } from './settings.service';
import { SettingsActiveToggle } from './settings-active-toggle';
import { SettingsStaffDialog } from './settings-staff-dialog';
import { SettingsStaffPasswordDialog } from './settings-staff-password-dialog';

type SettingsStaffProps = {
  session: Session;
  staff: Awaited<ReturnType<typeof listStaff>>;
};

/** Each role keeps one colour wherever staff are listed. */
const ROLE_TONES: Record<Role, string> = {
  owner: 'bg-[#1e3a34] text-white',
  admin: 'bg-muted text-foreground',
  front_desk: 'bg-status-waiting-soft text-status-waiting',
  nurse: 'bg-[#fde8ef] text-[#a3325c]',
  doctor: 'bg-status-exam-soft text-status-exam',
  pharmacist: 'bg-status-pharmacy-soft text-status-pharmacy',
  cashier: 'bg-status-cashier-soft text-status-cashier',
};

export function SettingsStaff(props: SettingsStaffProps) {
  const t = useTranslations();
  const { session } = props;
  const active = props.staff.filter((member) => member.is_active).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('settings.staff.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('settings.staff.summary', { active, total: props.staff.length })}
          </p>
        </div>
        <SettingsStaffDialog mode="create" actorRole={session.role} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('settings.staff.colName')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('settings.staff.colRole')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('settings.staff.colStatus')}</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.staff.map((member) => {
            const isSelf = member.id === session.userId;
            const locked = isSelf || (member.role === 'owner' && session.role !== 'owner');

            return (
              <TableRow key={member.id} className={member.is_active ? undefined : 'opacity-60'}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground">
                      {initials(member.full_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {member.full_name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {t('settings.staff.you')}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-muted-foreground">
                        {member.email ?? t('settings.staff.noEmail')}
                      </span>
                      {/* Phones: role (and status) fold under the e-mail. */}
                      <span className="mt-1 flex items-center gap-2 sm:hidden">
                        <span
                          className={cn(
                            'inline-flex h-5 items-center rounded px-1.5 text-[0.6875rem] font-medium',
                            ROLE_TONES[member.role],
                          )}>
                          {t(`roles.${member.role}`)}
                        </span>
                        {!member.is_active && (
                          <span className="text-xs text-muted-foreground">{t('common.inactive')}</span>
                        )}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span
                    className={cn(
                      'inline-flex h-6 items-center rounded-md px-2 text-xs font-medium',
                      ROLE_TONES[member.role],
                    )}>
                    {t(`roles.${member.role}`)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem]">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        member.is_active ? 'bg-primary' : 'bg-muted-foreground/50',
                      )}
                      aria-hidden
                    />
                    {member.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {locked ? (
                    <span className="text-xs text-muted-foreground">
                      {isSelf ? t('settings.staff.viaAccount') : t('settings.staff.ownerOnly')}
                    </span>
                  ) : (
                    <SettingsStaffDialog
                      mode="edit"
                      actorRole={session.role}
                      staff={member}
                      access={
                        <>
                          <SettingsStaffPasswordDialog staffId={member.id} name={member.full_name} />
                          <SettingsActiveToggle
                            id={member.id}
                            isActive={member.is_active}
                            action={setStaffActiveAction}
                            name={member.full_name}
                            consequence={t('settings.staff.deactivateConsequence')}
                          />
                        </>
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
