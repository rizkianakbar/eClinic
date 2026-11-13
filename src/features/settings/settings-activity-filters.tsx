'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { AUDIT_ACTION_LABELS, AUDIT_TABLE_LABELS } from './settings.constants';

type SettingsActivityFiltersProps = {
  table: string | null;
  actor: string | null;
  action: string | null;
  staff: { id: string; full_name: string }[];
};

/** Narrow the log by data, person and action. Applies on change; the date range stays. */
export function SettingsActivityFilters(props: SettingsActivityFiltersProps) {
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
        aria-label="Data"
        value={props.table ?? ''}
        onChange={(event) => set('table', event.target.value || null)}>
        <NativeSelectOption value="">Semua data</NativeSelectOption>
        {Object.entries(AUDIT_TABLE_LABELS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        size="sm"
        aria-label="Oleh"
        value={props.actor ?? ''}
        onChange={(event) => set('actor', event.target.value || null)}>
        <NativeSelectOption value="">Semua orang</NativeSelectOption>
        {props.staff.map((member) => (
          <NativeSelectOption key={member.id} value={member.id}>
            {member.full_name}
          </NativeSelectOption>
        ))}
        <NativeSelectOption value="system">Sistem</NativeSelectOption>
      </NativeSelect>
      <fieldset className={segmentedGroup}>
        <legend className="sr-only">Aksi</legend>
        <button type="button" className={segmentedItem(!props.action, 'h-7')} onClick={() => set('action', null)}>
          Semua
        </button>
        {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={segmentedItem(props.action === value, 'h-7')}
            onClick={() => set('action', value)}>
            {label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
