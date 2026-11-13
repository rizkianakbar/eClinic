import { z } from 'zod';
import { ROLE_LABELS } from '@/features/auth/auth.constants';
import type { Role } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { AUDIT_VALUE_LABELS } from './settings.constants';

const ROLES = Object.keys(ROLE_LABELS) as [Role, ...Role[]];

/** Accepts a form string or an already-parsed null; blank -> null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length <= max, message)
    .transform((value) => value || null);

const password = z.string().min(8, 'Kata sandi minimal 8 karakter.').max(72, 'Kata sandi maksimal 72 karakter.');

// Staff ----------------------------------------------------------------------

export const staffSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama wajib diisi.').max(200, 'Nama terlalu panjang, maksimal 200 karakter.'),
  role: z.enum(ROLES, { error: 'Pilih peran.' }),
  nik: z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value === '' || /^\d{16}$/.test(value), 'NIK harus 16 digit angka.')
    .transform((value) => value || null),
  sip_number: optionalText(50, 'Nomor SIP terlalu panjang, maksimal 50 karakter.'),
});

export const staffCreateSchema = staffSchema.extend({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email wajib diisi.')
    .pipe(z.email('Format email tidak valid, contoh: nama@klinik.com.')),
  password,
});

export const staffPasswordSchema = z.object({ password });

export type StaffInput = z.input<typeof staffSchema>;
export type StaffValues = z.output<typeof staffSchema>;
export type StaffCreateInput = z.input<typeof staffCreateSchema>;
export type StaffCreateValues = z.output<typeof staffCreateSchema>;
export type StaffPasswordValues = z.output<typeof staffPasswordSchema>;

/** Roles the current user may assign. Only an owner creates or edits owners (mirrors RLS). */
export function assignableRoles(actorRole: Role) {
  return ROLES.filter((role) => role !== 'owner' || actorRole === 'owner');
}

/** Maps Supabase Auth admin errors on create/update to an actionable message. */
export function staffAuthErrorMessage(error: { code?: string }) {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') {
    return 'Email ini sudah dipakai akun lain. Gunakan email lain.';
  }

  if (error.code === 'weak_password') {
    return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter campuran huruf dan angka.';
  }

  return 'Akun staf gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.';
}

// Polis ----------------------------------------------------------------------

export const poliSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama poli wajib diisi.')
    .max(100, 'Nama poli terlalu panjang, maksimal 100 karakter.'),
  bpjs_poli_code: optionalText(10, 'Kode poli BPJS maksimal 10 karakter.'),
  // Consultation tariff billed automatically for visits to this poli.
  consultation_service_id: z
    .string()
    .nullish()
    .transform((value) => value || null)
    .refine((value) => value === null || z.uuid().safeParse(value).success, 'Pilih tarif konsultasi.'),
});

export type PoliInput = z.input<typeof poliSchema>;
export type PoliValues = z.output<typeof poliSchema>;

/** Maps a Postgres error on master-data writes to an actionable message. */
export function masterDataErrorMessage(error: { code?: string }, duplicateMessage: string) {
  if (error.code === '23505') return duplicateMessage;
  if (error.code === '42501') return 'Anda tidak punya akses untuk perubahan ini. Hubungi pemilik klinik.';

  return 'Data gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.';
}

// Clinic profile -------------------------------------------------------------------

export const clinicProfileSchema = z.object({
  name: z.string().trim().min(1, 'Nama klinik wajib diisi.').max(200, 'Nama klinik maksimal 200 karakter.'),
  address: optionalText(500, 'Alamat maksimal 500 karakter.'),
  phone: optionalText(50, 'Telepon maksimal 50 karakter.'),
  email: z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim().toLowerCase())
    .refine((value) => value === '' || z.email().safeParse(value).success, 'Format email tidak valid.')
    .transform((value) => value || null),
  license_no: optionalText(100, 'Nomor izin maksimal 100 karakter.'),
  idle_logout_minutes: z.coerce
    .number<string | number>({ error: 'Isi menit dengan angka.' })
    .int('Menit harus bilangan bulat.')
    .min(1, 'Minimal 1 menit.')
    .max(240, 'Maksimal 240 menit.'),
});

export type ClinicProfileInput = z.input<typeof clinicProfileSchema>;
export type ClinicProfileValues = z.output<typeof clinicProfileSchema>;

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LOGO_MAX_BYTES = 1024 * 1024;

/** Checks an uploaded logo before it reaches Storage (the bucket enforces the same limits). */
export function logoFileError(file: { type: string; size: number }) {
  if (!LOGO_TYPES.includes(file.type as (typeof LOGO_TYPES)[number])) return 'Logo harus PNG, JPG, atau WEBP.';
  if (file.size > LOGO_MAX_BYTES) return 'Ukuran logo maksimal 1 MB.';

  return null;
}

// ICD-10 import -----------------------------------------------------------------

const ICD10_CODE = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

/** "j069" / " J06.9 " / "J06" -> "J06.9" / "J06.9" / "J06"; null when it can't be a code. */
export function normalizeIcd10Code(input: string) {
  const compact = input.trim().toUpperCase().replace(/\s+/g, '');
  const dotted = /^[A-Z][0-9]{2}[0-9A-Z]{1,4}$/.test(compact) ? `${compact.slice(0, 3)}.${compact.slice(3)}` : compact;

  return ICD10_CODE.test(dotted) ? dotted : null;
}

export type Icd10Row = { code: string; name: string; name_id: string | null };

/**
 * Rows from the clinic's file: [code, name, name_id?]. A first row that looks
 * like a header ("kode"/"code") is skipped. Invalid rows are reported with
 * their line number; duplicates keep the last occurrence.
 */
export function parseIcd10Rows(rows: readonly (readonly string[])[]) {
  const byCode = new Map<string, Icd10Row>();
  const skipped: { line: number; reason: string }[] = [];
  const hasHeader = /^(kode|code)/i.test(rows[0]?.[0]?.trim() ?? '');

  rows.forEach((row, index) => {
    if (index === 0 && hasHeader) return;

    const line = index + 1;
    const [rawCode = '', rawName = '', rawNameId = ''] = row.map((cell) => (cell ?? '').toString());

    if (rawCode.trim() === '' && rawName.trim() === '') return;

    const code = normalizeIcd10Code(rawCode);
    const name = rawName.trim();

    if (!code) {
      skipped.push({ line, reason: `Kode "${rawCode.trim()}" bukan format ICD-10.` });
    } else if (!name) {
      skipped.push({ line, reason: `Nama penyakit untuk ${code} kosong.` });
    } else {
      byCode.set(code, { code, name: name.slice(0, 500), name_id: rawNameId.trim().slice(0, 500) || null });
    }
  });

  return { rows: [...byCode.values()], skipped };
}

// Activity log ---------------------------------------------------------------------

const IGNORED_FIELDS = new Set(['updated_at', 'created_at', 'id', 'clinic_id']);

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function display(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'kosong';
  if (field === 'is_active') return value ? 'Aktif' : 'Nonaktif';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (typeof value === 'string' && TIMESTAMP.test(value)) return formatDateTime(value);

  if (field === 'role' && typeof value === 'string' && Object.hasOwn(ROLE_LABELS, value))
    return ROLE_LABELS[value as Role];

  if (typeof value === 'string' && Object.hasOwn(AUDIT_VALUE_LABELS, value)) return AUDIT_VALUE_LABELS[value];

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);

  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

export type AuditChange = {
  field: string;
  label: string;
  from: string;
  to: string /** A reference (…_id): which row, not a readable value. */;
  ref: boolean;
};

/** Fields that changed in an update (timestamps and ids ignored), labelled for staff. */
export function changedFields(before: unknown, after: unknown, labels: Record<string, string> = {}): AuditChange[] {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];

  const oldRow = before as Record<string, unknown>;
  const newRow = after as Record<string, unknown>;

  return Object.keys(newRow)
    .filter((key) => !IGNORED_FIELDS.has(key) && JSON.stringify(oldRow[key]) !== JSON.stringify(newRow[key]))
    .map((key) => ({
      field: key,
      label: labels[key] ?? key.replace(/_/g, ' '),
      from: display(key, oldRow[key]),
      to: display(key, newRow[key]),
      ref: key.endsWith('_id') || key.endsWith('_by'),
    }));
}

const SUBJECT_FIELDS = ['name', 'full_name', 'invoice_no', 'mrn', 'batch_no', 'description'] as const;

/** A human name for the audited row ("Paracetamol 500 mg"), or null when the row has none. */
export function auditSubject(before: unknown, after: unknown) {
  for (const row of [after, before]) {
    if (!row || typeof row !== 'object') continue;

    const record = row as Record<string, unknown>;
    const field = SUBJECT_FIELDS.find((key) => typeof record[key] === 'string' && record[key] !== '');

    if (field) return String(record[field]);
  }

  return null;
}

type GroupableLog = { actor_id: string | null; action: string; table_name: string; created_at: string };

/**
 * Folds runs of the same person doing the same thing to the same kind of
 * data within two minutes (an import, a package edit) into one entry.
 * Input is newest first; each group keeps that order.
 */
export function groupAuditLogs<T extends GroupableLog>(logs: readonly T[]): T[][] {
  const groups: T[][] = [];

  for (const log of logs) {
    const group = groups.at(-1);
    const head = group?.[0];

    if (
      group &&
      head &&
      head.actor_id === log.actor_id &&
      head.action === log.action &&
      head.table_name === log.table_name &&
      Date.parse(head.created_at) - Date.parse(log.created_at) <= 120_000
    ) {
      group.push(log);
    } else {
      groups.push([log]);
    }
  }

  return groups;
}
