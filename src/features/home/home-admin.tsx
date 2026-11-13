import {
  CalendarClockIcon,
  ListTreeIcon,
  PillIcon,
  SettingsIcon,
  StethoscopeIcon,
  TagIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import { isAuditTable } from '@/features/settings/settings.constants';
import type { listAuditLogs } from '@/features/settings/settings.service';
import { formatDateTime } from '@/lib/dates';

type HomeAdminProps = {
  activity: Awaited<ReturnType<typeof listAuditLogs>>['logs'];
};

/** Settings shortcuts; `key` names the label and hint under home.admin. */
const SHORTCUTS = [
  { href: '/settings/staff', key: 'staff', icon: UsersIcon },
  { href: '/settings/schedules', key: 'schedules', icon: CalendarClockIcon },
  { href: '/settings/polis', key: 'polis', icon: StethoscopeIcon },
  { href: '/settings/services', key: 'services', icon: TagIcon },
  { href: '/settings/medicines', key: 'medicines', icon: PillIcon },
  { href: '/settings/icd10', key: 'icd10', icon: ListTreeIcon },
  { href: '/settings/clinic', key: 'clinic', icon: SettingsIcon },
] as const;

/** The admin's desk: what changed recently, and the settings they touch most. */
export function HomeAdmin(props: HomeAdminProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title={t('home.admin.recent')} link={{ href: '/settings/activity', label: t('home.admin.log') }}>
        {props.activity.length === 0 ? (
          <PanelEmpty title={t('home.admin.none')} />
        ) : (
          <ul>
            {props.activity.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-b px-4 py-3 text-sm last:border-0">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">
                    {log.actorName ?? t(log.actor_id ? 'audit.staff' : 'audit.system')}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    {log.action === 'insert' || log.action === 'update' || log.action === 'delete'
                      ? t(`audit.verbs.${log.action}`)
                      : log.action}
                  </span>{' '}
                  {(isAuditTable(log.table_name) ? t(`audit.tables.${log.table_name}`) : log.table_name).toLowerCase()}
                </span>
                <span className="tabular shrink-0 text-[0.8125rem] text-muted-foreground">
                  {formatDateTime(log.created_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <HomeAdminShortcuts />
    </div>
  );
}

/** Admin's way into the master data: fixed links, so the loading screen shows them for real too. */
export function HomeAdminShortcuts() {
  const t = useTranslations('home.admin');

  return (
    <Panel title={t('settings')}>
      <ul>
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.href} className="border-b last:border-0">
            <Link href={shortcut.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <shortcut.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t(shortcut.key)}</span>
                <span className="block truncate text-[0.8125rem] text-muted-foreground">
                  {t(`${shortcut.key}Hint`)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
