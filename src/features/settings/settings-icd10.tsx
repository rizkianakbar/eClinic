'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INTL_LOCALE } from '@/i18n/locales';
import { useMessage } from '@/i18n/message';
import { useActionMutation } from '@/lib/query';
import { importIcd10Action } from './settings.actions';

type SettingsIcd10Props = {
  count: number;
};

type ImportResult = { imported: number; skipped: { line: number; reason: string }[]; skippedCount: number };

/** Upload the clinic's ICD-10 list (Excel or CSV: kode, nama, nama Indonesia). */
export function SettingsIcd10(props: SettingsIcd10Props) {
  const t = useTranslations('settings.icd10');
  const locale = useLocale();
  const message = useMessage();
  const tabular = (chunks: React.ReactNode) => <span className="tabular">{chunks}</span>;
  const bold = (chunks: React.ReactNode) => <span className="font-semibold">{chunks}</span>;
  const [result, setResult] = useState<ImportResult | null>(null);
  const importFile = useActionMutation(importIcd10Action);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm">
        {t.rich('available', { count: props.count.toLocaleString(INTL_LOCALE[locale]), b: bold })}
      </p>
      <div className="rounded-lg border p-4 text-sm">
        <p className="mb-2 font-medium">{t('format')}</p>
        <p className="text-muted-foreground">{t.rich('formatHint', { k: tabular })}</p>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();

          const form = event.currentTarget;

          importFile.mutate(new FormData(form), {
            onSuccess: (data) => {
              setResult(data);
              toast.success(t('imported', { count: data.imported }));
              form.reset();
            },
          });
        }}>
        <Input name="file" type="file" accept=".xlsx,.csv" className="max-w-xs" />
        <Button type="submit" disabled={importFile.isPending}>
          {importFile.isPending ? t('importing') : t('import')}
        </Button>
      </form>
      {result && (
        <div className="flex flex-col gap-1 text-sm">
          <p>{t.rich('result', { imported: result.imported, skipped: result.skippedCount, b: bold })}</p>
          {result.skipped.length > 0 && (
            <ul className="list-disc pl-5 text-muted-foreground">
              {result.skipped.map((row) => (
                <li key={row.line}>{t('line', { line: row.line, reason: message(row.reason) })}</li>
              ))}
              {result.skippedCount > result.skipped.length && (
                <li>{t('more', { count: result.skippedCount - result.skipped.length })}</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
