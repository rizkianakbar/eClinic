'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useRef, useState } from 'react';
import { Floating } from '@/components/ui/floating';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMedicineSearch } from './prescriptions.hooks';

export type PickedMedicine = { id: string; name: string; unit: string };

type PrescriptionsMedicinePickerProps = {
  id: string;
  value: PickedMedicine | null;
  onChange: (medicine: PickedMedicine | null) => void;
  invalid?: boolean;
};

/** Type to search active medicines; arrows + Enter to pick. Shows the pick with a "change" link. */
export function PrescriptionsMedicinePicker(props: PrescriptionsMedicinePickerProps) {
  const t = useTranslations('rx.picker');
  const anchor = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const search = useMedicineSearch(query);
  const results = query.trim().length >= 2 ? (search.data ?? []) : [];
  const active = Math.min(highlighted, Math.max(results.length - 1, 0));

  if (props.value) {
    return (
      <div className="flex h-8 items-center justify-between gap-2 rounded-lg border px-2.5 text-sm">
        <span className="truncate">
          {props.value.name} <span className="text-muted-foreground">({props.value.unit})</span>
        </span>
        <button type="button" className="text-xs underline" onClick={() => props.onChange(null)}>
          ganti
        </button>
      </div>
    );
  }

  function pick(medicine: PickedMedicine) {
    props.onChange(medicine);
    setQuery('');
    setHighlighted(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted(Math.min(active + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted(Math.max(active - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      pick(results[active]);
    }
  }

  return (
    <div ref={anchor} className="relative">
      <Input
        id={props.id}
        type="search"
        autoComplete="off"
        placeholder={t('placeholder')}
        aria-invalid={props.invalid}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
        }}
        onKeyDown={onKeyDown}
      />
      {query.trim().length >= 2 && (
        <Floating anchor={anchor}>
          <ul className="min-h-0 divide-y overflow-y-auto">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {search.isPending ? t('searching') : t('notFound')}
              </li>
            ) : (
              results.map((medicine, index) => (
                <li key={medicine.id}>
                  <button
                    type="button"
                    className={cn('w-full px-3 py-2 text-left text-sm hover:bg-muted', index === active && 'bg-muted')}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(medicine)}>
                    {medicine.name} <span className="text-muted-foreground">({medicine.unit})</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Floating>
      )}
    </div>
  );
}
