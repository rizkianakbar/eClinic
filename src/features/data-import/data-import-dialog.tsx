'use client';

import {
  CircleAlertIcon,
  CircleCheckIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  RefreshCwIcon,
  UploadIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { commitImportAction, previewImportAction } from './data-import.actions';
import { IMPORT_CONFIG, type ImportKind, type ImportPreviewRow, type ImportRowStatus } from './data-import.lib';

type DataImportDialogProps = {
  kind: ImportKind;
};

type Filter = 'all' | ImportRowStatus;

const STATUS: Record<ImportRowStatus, { label: string; chip: string }> = {
  new: { label: 'Baru', chip: 'bg-secondary text-secondary-foreground' },
  update: { label: 'Berubah', chip: 'bg-sky-50 text-sky-800' },
  same: { label: 'Tidak berubah', chip: 'bg-muted text-muted-foreground' },
  invalid: { label: 'Perlu diperbaiki', chip: 'bg-destructive/10 text-destructive' },
};

/** Rows drawn at once; the counts above always cover the whole file. */
const SHOWN = 200;

/**
 * Bulk add from Excel: download the template (empty or with today's data),
 * drop the filled file, check the preview, import. The server parses the
 * file again on import, so the preview can never be edited into bad data.
 */
export function DataImportDialog(props: DataImportDialogProps) {
  const config = IMPORT_CONFIG[props.kind];
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const preview = useActionMutation(previewImportAction);
  const commit = useActionMutation(commitImportAction);

  function reset() {
    setFile(null);
    setRows(null);
    setFilter('all');
    setUpdateExisting(true);
    setResult(null);
    preview.reset();
    commit.reset();
  }

  function formFor(selected: File) {
    const data = new FormData();

    data.set('kind', props.kind);
    data.set('file', selected);

    return data;
  }

  function choose(selected: File | undefined) {
    if (!selected) return;

    setFile(selected);
    setRows(null);
    setFilter('all');

    preview.mutate(formFor(selected), {
      onSuccess: (data) => setRows(data.rows),
      onError: () => setFile(null),
    });
  }

  const counts = { new: 0, update: 0, same: 0, invalid: 0 };

  for (const row of rows ?? []) counts[row.status] += 1;

  const toSave = counts.new + (updateExisting ? counts.update : 0);
  // Problems first, then what will change, so the rows that need attention are on top.
  const order: Record<ImportRowStatus, number> = { invalid: 0, new: 1, update: 2, same: 3 };

  const visible = (rows ?? [])
    .filter((row) => filter === 'all' || row.status === filter)
    .sort((a, b) => order[a.status] - order[b.status] || a.line - b.line);

  const step = result ? 'done' : rows ? 'preview' : 'pick';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheetIcon />
        Impor Excel
      </Button>
      <DialogContent variant="drawer" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impor {config.title.toLowerCase()} dari Excel</DialogTitle>
          <DialogDescription>
            Tambah atau perbarui banyak {config.noun} sekaligus. Anda melihat pratinjau dulu sebelum ada yang disimpan.
          </DialogDescription>
        </DialogHeader>

        {step === 'pick' && (
          <div className="flex flex-col gap-5">
            <ol className="grid gap-2 sm:grid-cols-3">
              {[
                { title: 'Unduh template', text: 'Kosong, atau berisi data sekarang untuk mengubah harga sekaligus.' },
                { title: 'Isi di Excel', text: 'Satu baris satu data. Kolom bertanda * wajib diisi.' },
                { title: 'Unggah di sini', text: 'Periksa pratinjau, lalu impor baris yang benar.' },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-2.5 rounded-xl border bg-card p-3">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.text}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/import-template/${props.kind}`}
                download
                className={buttonVariants({ variant: 'outline' })}>
                <DownloadIcon className="size-4" aria-hidden />
                Template kosong
              </a>
              <a
                href={`/api/import-template/${props.kind}?filled=1`}
                download
                className={buttonVariants({ variant: 'outline' })}>
                <DownloadIcon className="size-4" aria-hidden />
                Template berisi data sekarang
              </a>
            </div>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                choose(event.dataTransfer.files[0]);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary/20',
                dragging ? 'border-primary bg-secondary/50' : 'border-black/12 hover:border-primary/50',
                preview.isPending && 'pointer-events-none opacity-70',
              )}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                {preview.isPending ? (
                  <RefreshCwIcon className="size-5 animate-spin" aria-hidden />
                ) : (
                  <UploadIcon className="size-5" aria-hidden />
                )}
              </span>
              <span className="text-sm font-medium">
                {preview.isPending
                  ? `Memeriksa ${file?.name ?? 'file'}…`
                  : 'Tarik file ke sini, atau klik untuk memilih'}
              </span>
              <span className="text-xs text-muted-foreground">Excel (.xlsx) atau CSV, maksimal 4 MB</span>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="sr-only"
                onChange={(event) => {
                  choose(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Kolom di template</h3>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {config.columns.map((column) => (
                  <li key={column.key} className="flex flex-col gap-0.5 px-3.5 py-2.5 sm:flex-row sm:gap-4">
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium sm:w-40">
                      {column.header}
                      {column.required && <span className="text-xs font-normal text-destructive">wajib</span>}
                    </span>
                    <span className="text-[0.8125rem] text-muted-foreground">
                      {column.hint} <span className="text-foreground/80">Contoh: {column.example}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {step === 'preview' && rows && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <FileSpreadsheetIcon className="size-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{file?.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {rows.length.toLocaleString('id-ID')} baris berisi data
                  </span>
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={reset}>
                Ganti file
              </Button>
            </div>

            <dl className="grid grid-cols-2 divide-x overflow-hidden rounded-xl border bg-card sm:grid-cols-4 max-sm:[&>*:nth-child(n+3)]:border-t">
              {(['new', 'update', 'same', 'invalid'] as const).map((key) => (
                <div key={key} className="flex flex-col gap-0.5 px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{STATUS[key].label}</dt>
                  <dd className={cn('numeral text-2xl', key === 'invalid' && counts.invalid > 0 && 'text-destructive')}>
                    {counts[key]}
                  </dd>
                </div>
              ))}
            </dl>

            {counts.update > 0 && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-card px-3.5 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={updateExisting}
                  onChange={(event) => setUpdateExisting(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium">
                    Simpan perubahan pada {counts.update} {config.noun} yang sudah ada
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Dicocokkan dari nama. Jika tidak dicentang, baris ini dilewati dan data lama tetap. Baris yang tidak
                    berubah selalu dilewati.
                  </span>
                </span>
              </label>
            )}

            <div className="flex flex-col gap-2">
              <fieldset className={segmentedGroup}>
                <legend className="sr-only">Tampilkan baris</legend>
                {(['all', 'new', 'update', 'same', 'invalid'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={segmentedItem(filter === key)}
                    onClick={() => setFilter(key)}>
                    {key === 'all' ? 'Semua' : STATUS[key].label}
                    <span className="tabular text-xs opacity-70">{key === 'all' ? rows.length : counts[key]}</span>
                  </button>
                ))}
              </fieldset>
              <div className="overflow-hidden rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="w-14 px-3 py-2 font-medium">Baris</th>
                      <th className="px-3 py-2 font-medium">{config.columns[0].header}</th>
                      <th className="hidden px-3 py-2 font-medium sm:table-cell">Rincian</th>
                      <th className="px-3 py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visible.slice(0, SHOWN).map((row) => (
                      <tr key={row.line} className={cn('align-top', row.status === 'invalid' && 'bg-destructive/3')}>
                        <td className="tabular px-3 py-2 text-muted-foreground">{row.line}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium">
                            {row.cells[0] || <span className="text-muted-foreground italic">kosong</span>}
                          </span>
                          {row.errors.map((error) => (
                            <span key={error} className="mt-0.5 flex items-start gap-1 text-xs text-destructive">
                              <CircleAlertIcon className="mt-px size-3 shrink-0" aria-hidden />
                              {error}
                            </span>
                          ))}
                        </td>
                        <td className="hidden px-3 py-2 text-[0.8125rem] text-muted-foreground sm:table-cell">
                          {row.cells.slice(1).filter(Boolean).join(' · ')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={cn(
                              'inline-flex h-5 items-center rounded-md px-1.5 text-[0.6875rem] font-medium whitespace-nowrap',
                              STATUS[row.status].chip,
                            )}>
                            {row.status === 'update' && !updateExisting ? 'Dilewati' : STATUS[row.status].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Tidak ada baris di kelompok ini.
                  </p>
                )}
                {visible.length > SHOWN && (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Menampilkan {SHOWN} dari {visible.length.toLocaleString('id-ID')} baris.
                  </p>
                )}
              </div>
              {counts.invalid > 0 && (
                <p className="text-xs text-muted-foreground">
                  Baris yang perlu diperbaiki tidak ikut diimpor. Perbaiki di Excel lalu unggah lagi; data yang sudah
                  masuk akan dikenali sebagai &ldquo;Tidak berubah&rdquo;.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <CircleCheckIcon className="size-6" aria-hidden />
            </span>
            <p className="text-base font-semibold">Impor selesai</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {result.created} {config.noun} baru ditambahkan, {result.updated} diperbarui
              {result.skipped > 0 && `, ${result.skipped} baris dilewati`}.
            </p>
          </div>
        )}

        {step !== 'pick' && (
          <DialogFooter>
            {step === 'preview' ? (
              <>
                <Button variant="ghost" onClick={reset} disabled={commit.isPending}>
                  Pilih file lain
                </Button>
                <Button
                  disabled={toSave === 0 || commit.isPending}
                  onClick={() => {
                    if (!file) return;

                    const data = formFor(file);

                    if (updateExisting) data.set('update_existing', '1');
                    commit.mutate(data, { onSuccess: setResult });
                  }}>
                  {commit.isPending ? 'Mengimpor…' : `Impor ${toSave.toLocaleString('id-ID')} baris`}
                </Button>
              </>
            ) : (
              <Button onClick={() => setOpen(false)}>Selesai</Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
