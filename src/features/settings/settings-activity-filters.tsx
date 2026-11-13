'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { AUDIT_ACTIONS, AUDIT_TABLES } from './settings.constants';

type SettingsActivityFiltersProps = {
  table: string | null;
  actor: string | null;
  action: string | null;
  staff: { id: string; full_name: string }[];
};

/** Narrow the log by data, person and action. Applies on change; the date range stays. */
export function SettingsActivityFilters(props: SettingsActivityFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams);

    if (value) params.set(name, value);
    else params.delete(name);

    params.delete('page');
    router.push(`${pathname}?${params}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        size="sm"
        aria-label={t('settings.activity.data')}
        value={props.table ?? ''}
        onChange={(event) => set('table', event.target.value || null)}>
        <NativeSelectOption value="">{t('settings.activity.allData')}</NativeSelectOption>
        {AUDIT_TABLES.map((value) => (
          <NativeSelectOption key={value} value={value}>
            {t(`audit.tables.${value}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        size="sm"
        aria-label={t('settings.activity.by')}
        value={props.actor ?? ''}
        onChange={(event) => set('actor', event.target.value || null)}>
        <NativeSelectOption value="">{t('settings.activity.everyone')}</NativeSelectOption>
        {props.staff.map((member) => (
          <NativeSelectOption key={member.id} value={member.id}>
            {member.full_name}
          </NativeSelectOption>
        ))}
        <NativeSelectOption value="system">{t('audit.system')}</NativeSelectOption>
      </NativeSelect>
      <fieldset className={segmentedGroup}>
        <legend className="sr-only">{t('settings.activity.action')}</legend>
        <button type="button" className={segmentedItem(!props.action, 'h-7')} onClick={() => set('action', null)}>
          {t('settings.activity.all')}
        </button>
        {AUDIT_ACTIONS.map((value) => (
          <button
            key={value}
            type="button"
            className={segmentedItem(props.action === value, 'h-7')}
            onClick={() => set('action', value)}>
            {t(`audit.actions.${value}`)}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
