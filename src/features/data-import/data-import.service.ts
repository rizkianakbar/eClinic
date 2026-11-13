import 'server-only';
import ExcelJS from 'exceljs';
import { keyed } from '@/i18n/keyed';
import type { ActionResult } from '@/lib/query';
import { readSpreadsheet } from '@/lib/spreadsheet';
import { fetchAll } from '@/lib/supabase/fetch-all';
import type { SupabaseClient } from '@/lib/supabase/server';
import {
  IMPORT_CONFIG,
  IMPORT_MAX_ROWS,
  type ImportKind,
  type ImportPreviewRow,
  type ImportRowStatus,
  type ParsedImportRow,
  parseImportRows,
  sameAsSaved,
} from './data-import.lib';

const JADE = 'FF17735C';
const DATA_SHEET = 'Data';

/**
 * Every saved row of the kind (RLS keeps it to the clinic), paged past the 1000-row cap. Only the columns
 * the import compares and writes back (plus id; services also need type, to leave packages out).
 */
async function listExisting(supabase: SupabaseClient, kind: ImportKind) {
  const columns = ['id', ...IMPORT_CONFIG[kind].columns.map((column) => column.key)].join(', ');

  const rows = await fetchAll('listExisting', (from, to) =>
    supabase.from(kind).select(columns).order('name').order('id').range(from, to),
  );

  return rows as unknown as Record<string, unknown>[];
}

/**
 * The template: a "Data" sheet with the headers (required ones marked "*",
 * dropdowns for fixed choices) and a "Petunjuk" sheet explaining each column
 * with an example. With `filled`, the Data sheet holds the clinic's current
 * rows, so prices can be edited in bulk and imported back.
 */
export async function buildImportTemplate(supabase: SupabaseClient, kind: ImportKind, filled: boolean) {
  const config = IMPORT_CONFIG[kind];
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Klinik';

  const data = workbook.addWorksheet(DATA_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });

  data.columns = config.columns.map((column) => ({
    header: column.required ? `${column.header} *` : column.header,
    key: column.key,
    width: column.width,
  }));

  const header = data.getRow(1);

  header.height = 22;

  header.eachCell((cell, index) => {
    const column = config.columns[index - 1];

    cell.font = { bold: true, color: { argb: column.required ? 'FFFFFFFF' : 'FF14201D' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column.required ? JADE : 'FFE6EEEB' } };
    cell.alignment = { vertical: 'middle' };
    cell.note = column.hint;
  });

  if (filled) {
    const existing = (await listExisting(supabase, kind)).filter(
      (row) => kind !== 'services' || row.type !== 'package',
    );

    for (const row of existing) data.addRow(config.toCells(row));
  }

  // Dropdowns and number checks on the filled rows plus 500 empty ones.
  const lastRow = data.rowCount + 500;

  config.columns.forEach((column, index) => {
    const letter = data.getColumn(index + 1).letter;

    for (let row = 2; row <= lastRow; row += 1) {
      const cell = data.getCell(`${letter}${row}`);

      if (column.options) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: !column.required,
          formulae: [`"${column.options.join(',')}"`],
          showErrorMessage: true,
          errorTitle: column.header,
          error: `Pilih salah satu: ${column.options.join(', ')}.`,
        };
      } else if (typeof column.example === 'number') {
        cell.dataValidation = {
          type: 'whole',
          operator: 'greaterThanOrEqual',
          allowBlank: !column.required,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: column.header,
          error: 'Isi dengan angka bulat tanpa titik, contoh: 15000.',
        };
      }
    }
  });

  const guide = workbook.addWorksheet('Petunjuk');

  guide.columns = [
    { header: 'Kolom', key: 'header', width: 22 },
    { header: 'Wajib', key: 'required', width: 8 },
    { header: 'Cara mengisi', key: 'hint', width: 70 },
    { header: 'Contoh', key: 'example', width: 24 },
  ];

  guide.getRow(1).font = { bold: true };

  for (const column of config.columns) {
    guide.addRow({
      header: column.header,
      required: column.required ? 'Ya' : '',
      hint: column.hint,
      example: column.example,
    });
  }

  guide.addRow([]);
  guide.addRow(['Cara impor']).font = { bold: true };

  const steps = [
    `1. Isi sheet "${DATA_SHEET}" mulai baris 2, satu ${config.noun} per baris. Jangan ubah judul kolom.`,
    '2. Simpan sebagai .xlsx, lalu unggah di Pengaturan. Aplikasi menampilkan pratinjau sebelum menyimpan.',
    `3. Nama yang sudah ada di aplikasi bisa diperbarui atau dilewati; ${config.noun} tidak pernah dihapus lewat impor.`,
  ];

  for (const line of steps) guide.addRow([line]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function readAndParse(kind: ImportKind, file: File) {
  let sheet: string[][];

  try {
    sheet = await readSpreadsheet(file);
  } catch {
    return { error: 'dataImport.errors.unreadable' };
  }

  const parsed = parseImportRows(kind, sheet);

  if ('error' in parsed) return parsed;
  if (parsed.rows.length === 0) return { error: 'dataImport.errors.empty' };

  if (parsed.rows.length > IMPORT_MAX_ROWS) {
    return { error: keyed('dataImport.errors.tooManyRows', { max: IMPORT_MAX_ROWS }) };
  }

  return parsed;
}

async function existingByName(supabase: SupabaseClient, kind: ImportKind) {
  const rows = await listExisting(supabase, kind);

  return new Map(rows.map((row) => [String(row.name).toLowerCase(), row]));
}

function status(row: ParsedImportRow, existing: Map<string, Record<string, unknown>>): ImportRowStatus {
  if (!row.ok) return 'invalid';

  const saved = existing.get(row.values.name.toLowerCase());

  if (!saved) return 'new';

  return sameAsSaved(row.values, saved) ? 'same' : 'update';
}

/** Reads the file and labels every row as new, an update of an existing name, or invalid (with reasons). */
export async function previewImport(
  supabase: SupabaseClient,
  kind: ImportKind,
  file: File,
): Promise<ActionResult<{ rows: ImportPreviewRow[] }>> {
  const parsed = await readAndParse(kind, file);

  if ('error' in parsed) return { ok: false, error: parsed.error };

  const existing = await existingByName(supabase, kind);

  return {
    ok: true,
    data: {
      rows: parsed.rows.map((row) => ({
        line: row.line,
        cells: row.cells,
        status: status(row, existing),
        errors: row.ok ? [] : row.errors,
      })),
    },
  };
}

const CHUNK = 500;

/**
 * Saves the valid rows of the file (parsed again here, never trusted from the
 * browser). New names are inserted; existing names are updated by id when
 * `updateExisting`, otherwise left alone. Nothing is deleted or deactivated.
 */
export async function commitImport(
  supabase: SupabaseClient,
  kind: ImportKind,
  file: File,
  updateExisting: boolean,
): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  const parsed = await readAndParse(kind, file);

  if ('error' in parsed) return { ok: false, error: parsed.error };

  const existing = await existingByName(supabase, kind);

  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const row of parsed.rows) {
    if (!row.ok) {
      skipped += 1;
      continue;
    }

    const rowStatus = status(row, existing);

    if (rowStatus === 'new') inserts.push(row.values);
    else if (rowStatus === 'update' && updateExisting)
      updates.push({ ...row.values, id: existing.get(row.values.name.toLowerCase())!.id });
    else skipped += 1;
  }

  let created = 0;

  for (let start = 0; start < inserts.length; start += CHUNK) {
    const { error } = await supabase.from(kind).insert(inserts.slice(start, start + CHUNK) as never);

    if (error) {
      console.error('commitImport: insert failed', { kind, code: error.code, offset: start });

      return {
        ok: false,
        error: keyed('dataImport.errors.stoppedCreated', { created }),
      };
    }

    created += Math.min(CHUNK, inserts.length - start);
  }

  let updated = 0;

  for (let start = 0; start < updates.length; start += CHUNK) {
    const { error } = await supabase
      .from(kind)
      .upsert(updates.slice(start, start + CHUNK) as never, { onConflict: 'id', defaultToNull: false });

    if (error) {
      console.error('commitImport: update failed', { kind, code: error.code, offset: start });

      return {
        ok: false,
        error: keyed('dataImport.errors.stoppedUpdated', { created, updated }),
      };
    }

    updated += Math.min(CHUNK, updates.length - start);
  }

  return { ok: true, data: { created, updated, skipped } };
}
