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

  if (!isImportKind(kind)) return { error: 'dataImport.errors.unknownKind' };
  if (!(file instanceof File) || file.size === 0) return { error: 'dataImport.errors.pickFile' };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: 'dataImport.errors.fileType' };
  if (file.size > IMPORT_MAX_BYTES) return { error: 'dataImport.errors.fileSize' };

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
