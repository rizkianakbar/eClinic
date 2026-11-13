'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActionMutation } from '@/lib/query';
import { importIcd10Action } from './settings.actions';

type SettingsIcd10Props = {
  count: number;
};

type ImportResult = { imported: number; skipped: { line: number; reason: string }[]; skippedCount: number };

/** Upload the clinic's ICD-10 list (Excel or CSV: kode, nama, nama Indonesia). */
export function SettingsIcd10(props: SettingsIcd10Props) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const importFile = useActionMutation(importIcd10Action);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm">
        <span className="font-semibold">{props.count.toLocaleString('id-ID')}</span> kode ICD-10 tersedia untuk
        pencarian diagnosis.
      </p>
      <div className="rounded-lg border p-4 text-sm">
        <p className="mb-2 font-medium">Format file</p>
        <p className="text-muted-foreground">
          Excel (.xlsx) atau CSV, satu kode per baris: <span className="tabular">kode, nama, nama Indonesia</span>.
          Baris judul boleh ada. Kode seperti <span className="tabular">J069</span> otomatis menjadi{' '}
          <span className="tabular">J06.9</span>. Kode yang sudah ada diperbarui, tidak ada yang dihapus.
        </p>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();

          const form = event.currentTarget;

          importFile.mutate(new FormData(form), {
            onSuccess: (data) => {
              setResult(data);
              toast.success(`${data.imported} kode ICD-10 diimpor.`);
              form.reset();
            },
          });
        }}>
        <Input name="file" type="file" accept=".xlsx,.csv" className="max-w-xs" />
        <Button type="submit" disabled={importFile.isPending}>
          {importFile.isPending ? 'Mengimpor...' : 'Impor'}
        </Button>
      </form>
      {result && (
        <div className="flex flex-col gap-1 text-sm">
          <p>
            Diimpor: <span className="font-semibold">{result.imported}</span> · Dilewati:{' '}
            <span className="font-semibold">{result.skippedCount}</span>
          </p>
          {result.skipped.length > 0 && (
            <ul className="list-disc pl-5 text-muted-foreground">
              {result.skipped.map((row) => (
                <li key={row.line}>
                  Baris {row.line}: {row.reason}
                </li>
              ))}
              {result.skippedCount > result.skipped.length && (
                <li>… dan {result.skippedCount - result.skipped.length} lainnya</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
