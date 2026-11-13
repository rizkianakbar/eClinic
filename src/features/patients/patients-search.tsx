'use client';

import { CornerDownLeftIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useState } from 'react';
import { cn } from '@/lib/utils';
import { SEX_LABELS } from './patients.constants';
import { type SearchPatient, usePatientSearch } from './patients.hooks';
import { ageInYears, formatIdNumber, initials, parsePatientSearch } from './patients.lib';
import { PatientsSheet } from './patients-sheet';

type PatientSearchProps = {
  autoFocus?: boolean;
  /** "page" sits on a page; "palette" fills the ⌘K dialog. */
  variant?: 'page' | 'palette';
  /** Called when a patient (or "new patient") is opened. */
  onNavigate?: () => void;
  /** Select mode: choosing a patient calls this instead of opening their page. */
  onSelect?: (patient: SearchPatient) => void;
  /** The patient currently chosen in select mode. */
  selectedId?: string;
  /** Short notes per patient id, e.g. "Terdaftar hari ini · No. 7". */
  notes?: Record<string, string>;
};

/** Keyboard-first: type or scan (MRN), arrows to move, Enter to open. */
export function PatientSearch(props: PatientSearchProps) {
  const router = useRouter();
  const palette = props.variant === 'palette';
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const search = usePatientSearch(query);
  const searching = parsePatientSearch(query) !== null;
  const results = searching ? (search.data ?? []) : [];
  const active = Math.min(highlighted, Math.max(results.length - 1, 0));

  function open(href: string) {
    props.onNavigate?.();
    router.push(href);
  }

  function choose(patient: SearchPatient) {
    if (props.onSelect) props.onSelect(patient);
    else open(`/patients/${patient.id}`);
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
      choose(results[active]);
    }
  }

  return (
    <div className={cn('flex flex-col', palette ? 'gap-2' : 'gap-3')}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          // biome-ignore lint/a11y/noAutofocus: front desk is keyboard-first; the search (and the Ctrl K palette) opens ready to type. Callers can pass autoFocus={false}.
          autoFocus={props.autoFocus ?? true}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Cari pasien"
          placeholder="Nama, NIK, nomor HP, atau no. RM"
          className={cn(
            'w-full min-w-0 bg-card pr-3 pl-11 text-base text-foreground outline-none placeholder:text-muted-foreground/70',
            palette
              ? 'h-12 rounded-lg'
              : 'h-12 rounded-xl border border-input shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-[border-color,box-shadow] focus:border-primary/60 focus:ring-3 focus:ring-primary/12',
          )}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {!searching && (
        <p className={cn('text-[0.8125rem] text-muted-foreground', palette && 'px-3 pb-1')}>
          Bisa juga memindai kartu berobat. Pilih dengan <Kbd>↑</Kbd> <Kbd>↓</Kbd>, buka dengan <Kbd>Enter</Kbd>.
        </p>
      )}

      {searching && !search.isPending && results.length === 0 && (
        <div
          className={cn(
            'flex flex-col items-center gap-3 py-6 text-center',
            !palette && 'rounded-xl border border-dashed',
          )}>
          <p className="text-sm text-muted-foreground">Tidak ada pasien yang cocok dengan “{query.trim()}”.</p>
          <PatientsSheet mode="create" trigger="link" onSaved={props.onNavigate} />
        </div>
      )}

      {results.length > 0 && (
        <ul
          aria-label="Hasil pencarian"
          className={cn('flex flex-col', palette ? 'border-t pt-2' : 'overflow-hidden rounded-xl border bg-card p-1')}>
          {results.map((patient, index) => {
            const selected = props.selectedId === patient.id;

            const rowClass = cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
              selected ? 'bg-secondary' : index === active ? 'bg-muted' : 'hover:bg-muted/60',
            );

            const content = (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.8125rem] font-semibold text-secondary-foreground">
                  {initials(patient.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{patient.full_name}</span>
                    {patient.bpjs_number && (
                      <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
                        BPJS
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-muted-foreground">
                    {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]}, {ageInYears(patient.birth_date)} th
                    {patient.nik && <> · NIK {formatIdNumber(patient.nik)}</>}
                  </span>
                </span>
                {props.notes?.[patient.id] ? (
                  <span className="shrink-0 rounded-md bg-status-waiting-soft px-2 text-xs leading-6 font-medium text-status-waiting">
                    {props.notes[patient.id]}
                  </span>
                ) : (
                  <span className="tabular hidden text-[0.8125rem] font-medium text-muted-foreground sm:block">
                    RM {patient.mrn}
                  </span>
                )}
                <CornerDownLeftIcon
                  className={cn('size-4 shrink-0 text-muted-foreground', index !== active && 'invisible')}
                  aria-hidden
                />
              </>
            );

            return (
              <li key={patient.id}>
                {props.onSelect ? (
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={rowClass}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => choose(patient)}>
                    {content}
                  </button>
                ) : (
                  <Link
                    href={`/patients/${patient.id}`}
                    onClick={props.onNavigate}
                    aria-current={index === active ? 'true' : undefined}
                    className={rowClass}
                    onMouseEnter={() => setHighlighted(index)}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type KbdProps = {
  children: string;
};

function Kbd(props: KbdProps) {
  return (
    <kbd className="rounded border bg-card px-1 font-sans text-[0.6875rem] font-medium text-foreground">
      {props.children}
    </kbd>
  );
}
