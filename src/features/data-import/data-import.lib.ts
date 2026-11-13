import type { z } from 'zod';
import { DOCTOR_FEE_TYPE_LABELS, SERVICE_TYPE_LABELS } from '@/features/billing/billing.constants';
import { serviceSchema } from '@/features/billing/billing.lib';
import { medicineSchema, supplierSchema } from '@/features/inventory/inventory.lib';

export const IMPORT_KINDS = ['medicines', 'suppliers', 'services'] as const;

export type ImportKind = (typeof IMPORT_KINDS)[number];

export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value);
}

export type ImportColumn = {
  key: string;
  header: string;
  required: boolean;
  /** Shown in the guide sheet and the drawer. */
  hint: string;
  example: string | number;
  /** Fixed choices: the template gets a dropdown. */
  options?: readonly string[];
  width: number;
};

/** Paket needs its item list, so it is not importable; the rest map label -> enum. */
const SERVICE_TYPES = ['consultation', 'procedure', 'other'] as const;
const FEE_TYPES = ['none', 'fixed', 'percent'] as const;

function fromLabel<T extends string>(labels: Record<T, string>, allowed: readonly T[], value: string): string {
  const text = value.trim().toLowerCase();

  if (text === '') return '';

  const match = allowed.find((key) => key === text || labels[key].toLowerCase() === text);

  // An unknown label is passed through, so the schema reports "pilih ..." for that row.
  return match ?? text;
}

type KindConfig = {
  /** Singular noun for messages ("obat"). */
  noun: string;
  title: string;
  fileName: string;
  columns: readonly ImportColumn[];
  schema: z.ZodType;
  /** Cells keyed by column -> the schema's input. */
  toInput: (cells: Record<string, string>) => unknown;
  /** A saved row -> template cells, for "download current data". */
  toCells: (row: Record<string, unknown>) => (string | number)[];
};

export const IMPORT_CONFIG: Record<ImportKind, KindConfig> = {
  medicines: {
    noun: 'obat',
    title: 'Obat',
    fileName: 'template-obat.xlsx',
    columns: [
      {
        key: 'name',
        header: 'Nama obat',
        required: true,
        hint: 'Nama lengkap dengan kekuatan, unik per klinik.',
        example: 'Paracetamol 500 mg',
        width: 32,
      },
      {
        key: 'unit',
        header: 'Satuan',
        required: true,
        hint: 'Satuan terkecil yang diserahkan: tablet, kapsul, botol, tube, pcs.',
        example: 'tablet',
        width: 12,
      },
      {
        key: 'price',
        header: 'Harga jual',
        required: true,
        hint: 'Rupiah per satuan, angka saja tanpa Rp atau titik.',
        example: 500,
        width: 14,
      },
      {
        key: 'min_stock',
        header: 'Stok minimum',
        required: true,
        hint: 'Peringatan stok menipis muncul di bawah angka ini.',
        example: 100,
        width: 14,
      },
      {
        key: 'kfa_code',
        header: 'Kode KFA',
        required: false,
        hint: 'Kode Kamus Farmasi dan Alat Kesehatan untuk SATUSEHAT. Boleh kosong dulu.',
        example: '93000501',
        width: 14,
      },
    ],
    schema: medicineSchema,
    toInput: (cells) => ({ ...cells, kfa_code: cells.kfa_code || null }),
    toCells: (row) => [
      String(row.name),
      String(row.unit),
      Number(row.price),
      Number(row.min_stock),
      String(row.kfa_code ?? ''),
    ],
  },
  suppliers: {
    noun: 'supplier',
    title: 'Supplier',
    fileName: 'template-supplier.xlsx',
    columns: [
      {
        key: 'name',
        header: 'Nama supplier',
        required: true,
        hint: 'Nama PBF atau distributor, unik per klinik.',
        example: 'PT Sehat Farma',
        width: 32,
      },
      {
        key: 'phone',
        header: 'Telepon',
        required: false,
        hint: 'Nomor yang dihubungi saat memesan.',
        example: '021-7654321',
        width: 18,
      },
      {
        key: 'address',
        header: 'Alamat',
        required: false,
        hint: 'Alamat kantor atau gudang.',
        example: 'Jl. Margonda Raya 10, Depok',
        width: 40,
      },
    ],
    schema: supplierSchema,
    toInput: (cells) => cells,
    toCells: (row) => [String(row.name), String(row.phone ?? ''), String(row.address ?? '')],
  },
  services: {
    noun: 'layanan',
    title: 'Tarif layanan',
    fileName: 'template-tarif-layanan.xlsx',
    columns: [
      {
        key: 'name',
        header: 'Nama layanan',
        required: true,
        hint: 'Nama yang tercetak di kuitansi, unik per klinik.',
        example: 'Jahit luka ringan',
        width: 32,
      },
      {
        key: 'type',
        header: 'Jenis',
        required: true,
        hint: 'Konsultasi, Tindakan, atau Lainnya. Paket dibuat di aplikasi.',
        example: SERVICE_TYPE_LABELS.procedure,
        options: SERVICE_TYPES.map((type) => SERVICE_TYPE_LABELS[type]),
        width: 14,
      },
      { key: 'price', header: 'Tarif', required: true, hint: 'Rupiah, angka saja.', example: 150000, width: 14 },
      {
        key: 'doctor_fee_type',
        header: 'Jasa dokter',
        required: false,
        hint: 'Tidak ada, Nominal tetap, atau Persentase. Kosong = Tidak ada.',
        example: DOCTOR_FEE_TYPE_LABELS.percent,
        options: FEE_TYPES.map((type) => DOCTOR_FEE_TYPE_LABELS[type]),
        width: 16,
      },
      {
        key: 'doctor_fee_value',
        header: 'Nilai jasa dokter',
        required: false,
        hint: 'Rupiah untuk nominal tetap, angka 0–100 untuk persentase.',
        example: 30,
        width: 16,
      },
    ],
    schema: serviceSchema,
    toInput: (cells) => ({
      ...cells,
      type: fromLabel(SERVICE_TYPE_LABELS, SERVICE_TYPES, cells.type ?? ''),
      doctor_fee_type: fromLabel(
        DOCTOR_FEE_TYPE_LABELS,
        FEE_TYPES,
        cells.doctor_fee_type || DOCTOR_FEE_TYPE_LABELS.none,
      ),
    }),
    toCells: (row) => [
      String(row.name),
      SERVICE_TYPE_LABELS[row.type as keyof typeof SERVICE_TYPE_LABELS] ?? String(row.type),
      Number(row.price),
      DOCTOR_FEE_TYPE_LABELS[row.doctor_fee_type as keyof typeof DOCTOR_FEE_TYPE_LABELS] ?? '',
      row.doctor_fee_type === 'none' ? '' : Number(row.doctor_fee_value),
    ],
  },
};

/** Largest file the clinic is expected to bring (a full formulary is a few thousand rows). */
export const IMPORT_MAX_ROWS = 3000;
export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;

export type ImportRowStatus = 'new' | 'update' | 'same' | 'invalid';

/** True when every imported field already holds this value, so saving would change nothing. */
export function sameAsSaved(values: Record<string, unknown>, saved: Record<string, unknown>) {
  return Object.entries(values).every(
    ([key, value]) =>
      (value ?? null) === (saved[key] ?? null) ||
      (key === 'name' && String(value).toLowerCase() === String(saved[key]).toLowerCase()),
  );
}

export type ImportPreviewRow = {
  /** Row number in Excel, so staff can find it. */
  line: number;
  status: ImportRowStatus;
  /** Cell text per column, as typed. */
  cells: string[];
  errors: string[];
};

export type ParsedImportRow =
  | { line: number; cells: string[]; ok: true; values: Record<string, unknown> & { name: string } }
  | { line: number; cells: string[]; ok: false; errors: string[] };

function normalizeHeader(text: string) {
  return text.toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Validates a sheet against the kind's columns. Columns are found by their
 * header text (any order, "*" ignored), so a reordered template still works.
 * Each row goes through the same Zod schema as the add form; a name that
 * repeats within the file is reported on the later row.
 */
export function parseImportRows(
  kind: ImportKind,
  sheet: readonly (readonly string[])[],
): { error: string } | { rows: ParsedImportRow[] } {
  const config = IMPORT_CONFIG[kind];

  const headerIndex = sheet.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === normalizeHeader(config.columns[0].header)),
  );

  if (headerIndex === -1) {
    return {
      error: `Baris judul tidak ditemukan. Pakai template ${config.title.toLowerCase()} dan jangan ubah judul kolomnya.`,
    };
  }

  const header = sheet[headerIndex].map(normalizeHeader);
  const positions = config.columns.map((column) => header.indexOf(normalizeHeader(column.header)));
  const missing = config.columns.filter((column, index) => column.required && positions[index] === -1);

  if (missing.length > 0) {
    return {
      error: `Kolom ${missing.map((column) => `"${column.header}"`).join(', ')} tidak ada. Pakai template terbaru.`,
    };
  }

  const dataRows = sheet.slice(headerIndex + 1);
  const seen = new Map<string, number>();
  const rows: ParsedImportRow[] = [];

  dataRows.forEach((row, offset) => {
    const line = headerIndex + offset + 2;
    const cells = positions.map((position) => (position === -1 ? '' : (row[position] ?? '').toString().trim()));

    if (cells.every((cell) => cell === '')) return;

    const record = Object.fromEntries(config.columns.map((column, index) => [column.key, cells[index]]));
    const parsed = config.schema.safeParse(config.toInput(record));

    if (!parsed.success) {
      rows.push({ line, cells, ok: false, errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] });

      return;
    }

    const values = parsed.data as Record<string, unknown> & { name: string };
    const key = values.name.toLowerCase();
    const earlier = seen.get(key);

    if (earlier !== undefined) {
      rows.push({ line, cells, ok: false, errors: [`Nama sama dengan baris ${earlier}. Hapus salah satu.`] });

      return;
    }

    seen.set(key, line);
    rows.push({ line, cells, ok: true, values });
  });

  return { rows };
}
