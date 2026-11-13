'use client';

import { PlusIcon, StarIcon, XIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type KeyboardEvent, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Floating } from '@/components/ui/floating';
import { Input } from '@/components/ui/input';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { addDiagnosisAction, removeDiagnosisAction, setPrimaryDiagnosisAction } from './exam.actions';
import { useIcd10Search } from './exam.hooks';
import { icd10Name, parseIcd10Search } from './exam.lib';
import type { listDiagnoses } from './exam.service';

type ExamDiagnosesProps = {
  visitId: string;
  diagnoses: Awaited<ReturnType<typeof listDiagnoses>>;
  editable: boolean;
};

export function ExamDiagnoses(props: ExamDiagnosesProps) {
  const t = useTranslations('exam.diagnoses');
  const locale = useLocale();
  const add = useActionMutation((code: string) => addDiagnosisAction(props.visitId, code));
  const setPrimary = useActionMutation(setPrimaryDiagnosisAction);
  const remove = useActionMutation(removeDiagnosisAction);
  const busy = add.isPending || setPrimary.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-2">
      {props.diagnoses.length === 0 ? (
        !props.editable && <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border">
          {props.diagnoses.map((diagnosis) => (
            <li key={diagnosis.id} className="flex items-center gap-3 border-b px-3 py-2.5 text-sm last:border-0">
              <span className="tabular w-14 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-center text-xs font-semibold">
                {diagnosis.icd10_code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{icd10Name(diagnosis.icd10, locale)}</span>
                {locale === 'id' && diagnosis.icd10?.name_id && (
                  <span className="block truncate text-xs text-muted-foreground">{diagnosis.icd10.name}</span>
                )}
              </span>
              {diagnosis.is_primary ? (
                <Badge variant="secondary">
                  <StarIcon className="fill-current" />
                  {t('primary')}
                </Badge>
              ) : (
                props.editable && (
                  <Button size="xs" variant="ghost" disabled={busy} onClick={() => setPrimary.mutate(diagnosis.id)}>
                    <StarIcon />
                    {t('makePrimary')}
                  </Button>
                )
              )}
              {props.editable && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t('remove', { code: diagnosis.icd10_code })}
                  disabled={busy}
                  onClick={() => remove.mutate(diagnosis.id)}>
                  <XIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {props.editable && <Icd10Picker disabled={busy} onPick={(code) => add.mutate(code)} />}
    </div>
  );
}

type Icd10PickerProps = {
  disabled: boolean;
  onPick: (code: string) => void;
};

/** Type a disease name or code; arrows to move, Enter to add. */
function Icd10Picker(props: Icd10PickerProps) {
  const t = useTranslations('exam.diagnoses');
  const locale = useLocale();
  const anchor = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const search = useIcd10Search(query);
  const results = parseIcd10Search(query) ? (search.data ?? []) : [];
  const active = Math.min(highlighted, Math.max(results.length - 1, 0));

  function pick(code: string) {
    props.onPick(code);
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
      pick(results[active].code);
    }
  }

  return (
    <div className="relative">
      <div ref={anchor} className="relative">
        <PlusIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={t('search')}
          placeholder={t('placeholder')}
          className="pl-9"
          value={query}
          disabled={props.disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setQuery(''), 150)}
        />
      </div>
      {parseIcd10Search(query) && (
        <Floating anchor={anchor}>
          {!search.isPending && results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">{t('notFound')}</p>
          ) : (
            <ul className="min-h-0 overflow-y-auto p-1">
              {results.map((item, index) => (
                <li key={item.code}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left text-sm',
                      index === active && 'bg-muted',
                    )}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(item.code)}>
                    <span className="tabular w-14 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-center text-xs font-semibold">
                      {item.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{icd10Name(item, locale)}</span>
                      {locale === 'id' && item.name_id && (
                        <span className="block text-xs text-muted-foreground">{item.name}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Floating>
      )}
    </div>
  );
}
