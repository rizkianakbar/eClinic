'use server';

import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { IMPORT_MAX_BYTES, type ImportKind, isImportKind } from './data-import.lib';
import { commitImport, previewImport } from './data-import.service';

const MANAGERS = ['owner', 'admin'] as const;

function readForm(formData: FormData): { kind: ImportKind; file: File } | { error: string } {
  const kind = String(formData.get('kind') ?? '');
  const file = formData.get('file');

  if (!isImportKind(kind)) return { error: 'Jenis data tidak dikenal. Muat ulang halaman.' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Pilih file Excel terlebih dahulu.' };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: 'File harus Excel (.xlsx) atau CSV.' };
  if (file.size > IMPORT_MAX_BYTES) return { error: 'Ukuran file maksimal 4 MB. Bagi menjadi beberapa file.' };

  return { kind, file };
}

export async function previewImportAction(formData: FormData) {
  await requireRole(...MANAGERS);

  const form = readForm(formData);

  if ('error' in form) return { ok: false, error: form.error } satisfies ActionResult;

  return previewImport(await createClient(), form.kind, form.file);
}

export async function commitImportAction(formData: FormData) {
  await requireRole(...MANAGERS);

  const form = readForm(formData);

  if ('error' in form) return { ok: false, error: form.error } satisfies ActionResult;

  return commitImport(await createClient(), form.kind, form.file, formData.get('update_existing') === '1');
}
