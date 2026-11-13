import { getTranslations } from 'next-intl/server';
import { parsePage } from '@/features/inventory/inventory.lib';
import { parseRange } from '@/features/reports/reports.lib';
import { ReportsRangeFilter } from '@/features/reports/reports-range-filter';
import { AUDIT_ACTIONS, type AuditAction, isAuditTable } from '@/features/settings/settings.constants';
import { listAuditLogs, listStaff } from '@/features/settings/settings.service';
import { SettingsActivity } from '@/features/settings/settings-activity';
import { SettingsActivityFilters } from '@/features/settings/settings-activity-filters';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.activity.pageTitle');

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ActivityPage(props: PageProps<'/settings/activity'>) {
  await requireRole('owner', 'admin');

  const searchParams = await props.searchParams;
  const today = todayInJakarta();
  const range = parseRange(searchParams, today);
  const rawTable = first(searchParams.table);
  const table = rawTable && isAuditTable(rawTable) ? rawTable : null;
  const rawAction = first(searchParams.action);
  const action = rawAction && AUDIT_ACTIONS.includes(rawAction as AuditAction) ? rawAction : null;
  const rawActor = first(searchParams.actor);
  const actor = rawActor && (rawActor === 'system' || /^[0-9a-f-]{36}$/i.test(rawActor)) ? rawActor : null;
  const page = parsePage(searchParams.page);

  const supabase = await createClient();

  const [result, staff, t] = await Promise.all([
    listAuditLogs(supabase, { range, table, actor, action, page }),
    listStaff(supabase),
    getTranslations('settings.activity'),
  ]);

  const filters = { ...(table && { table }), ...(actor && { actor }), ...(action && { action }) };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('intro')}</p>
        </div>
        <ReportsRangeFilter range={range} today={today} keep={filters} />
        <SettingsActivityFilters table={table} actor={actor} action={action} staff={staff} />
      </div>
      <SettingsActivity {...result} range={range} params={{ ...range, ...filters }} page={page} today={today} />
    </div>
  );
}
