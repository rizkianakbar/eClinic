import { z } from 'zod';
import { ROLE_LABELS } from '@/features/auth/auth.constants';
import { keyed } from '@/i18n/keyed';
import type { Role } from '@/lib/auth';
import { parseRupiah } from '@/lib/money';
import { AUDIT_VALUE_CODES } from './settings.constants';

const ROLES = Object.keys(ROLE_LABELS) as [Role, ...Role[]];

/** Accepts a form string or an already-parsed null; blank -> null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length <= max, message)
    .transform((value) => value || null);

const password = z.string().min(8, 'settings.errors.passwordMin').max(72, 'settings.errors.passwordMax');

// Staff ----------------------------------------------------------------------

export const staffSchema = z.object({
  full_name: z.string().trim().min(1, 'settings.errors.nameRequired').max(200, 'settings.errors.nameTooLong'),
  role: z.enum(ROLES, { error: 'settings.errors.pickRole' }),
  nik: z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value === '' || /^\d{16}$/.test(value), 'settings.errors.nik')
    .transform((value) => value || null),
  sip_number: optionalText(50, 'settings.errors.sipTooLong'),
});

export const staffCreateSchema = staffSchema.extend({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'settings.errors.emailRequired')
    .pipe(z.email('settings.errors.emailFormat')),
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

/** Maps Supabase Auth admin errors on create/update to a message key. */
export function staffAuthErrorMessage(error: { code?: string }) {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') {
    return 'settings.errors.emailTaken';
  }

  if (error.code === 'weak_password') {
    return 'settings.errors.weakPassword';
  }

  return 'settings.errors.staffSaveFailed';
}

// Polis ----------------------------------------------------------------------

/** The poli form's "+ Tarif baru" choice: create the consultation tariff together with the poli. */
export const NEW_CONSULTATION = 'new';

export const poliSchema = z
  .object({
    name: z.string().trim().min(1, 'settings.errors.poliNameRequired').max(100, 'settings.errors.poliNameTooLong'),
    bpjs_poli_code: optionalText(10, 'settings.errors.bpjsCodeTooLong'),
    // Consultation tariff billed automatically for visits to this poli: an existing one, a new one, or none.
    consultation_service_id: z
      .string()
      .nullish()
      .transform((value) => value || null)
      .refine(
        (value) => value === null || value === NEW_CONSULTATION || z.uuid().safeParse(value).success,
        'settings.errors.pickConsultation',
      ),
    /** The new tariff's price (only with NEW_CONSULTATION). */
    consultation_price: z
      .union([z.string(), z.number()])
      .nullish()
      .transform((value) =>
        value === null || value === undefined || value === ''
          ? null
          : typeof value === 'number'
            ? value
            : parseRupiah(value),
      ),
  })
  .superRefine((values, context) => {
    if (values.consultation_service_id !== NEW_CONSULTATION) return;

    const price = values.consultation_price;

    if (price === null || price < 0 || price > 1_000_000_000) {
      context.addIssue({ code: 'custom', path: ['consultation_price'], message: 'settings.errors.consultationPrice' });
    }
  });

export type PoliInput = z.input<typeof poliSchema>;
export type PoliValues = z.output<typeof poliSchema>;

/** Maps a master-data write error to a message key; `duplicateMessage` is the key for a taken name. */
export function masterDataErrorMessage(error: { code?: string }, duplicateMessage: string) {
  if (error.code === '23505' && duplicateMessage) return duplicateMessage;
  if (error.code === '42501') return 'errors.noAccessMaster';

  return 'errors.saveFailed';
}

// Clinic profile -------------------------------------------------------------------

export const clinicProfileSchema = z.object({
  name: z.string().trim().min(1, 'settings.errors.clinicNameRequired').max(200, 'settings.errors.clinicNameTooLong'),
  address: optionalText(500, 'settings.errors.addressTooLong'),
  phone: optionalText(50, 'settings.errors.phoneTooLong'),
  email: z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim().toLowerCase())
    .refine((value) => value === '' || z.email().safeParse(value).success, 'settings.errors.emailInvalid')
    .transform((value) => value || null),
  license_no: optionalText(100, 'settings.errors.licenseTooLong'),
  idle_logout_minutes: z.coerce
    .number<string | number>({ error: 'settings.errors.minutesNumber' })
    .int('settings.errors.minutesInteger')
    .min(1, 'settings.errors.minutesMin')
    .max(240, 'settings.errors.minutesMax'),
});

export type ClinicProfileInput = z.input<typeof clinicProfileSchema>;
export type ClinicProfileValues = z.output<typeof clinicProfileSchema>;

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LOGO_MAX_BYTES = 1024 * 1024;

/** Checks an uploaded logo before it reaches Storage (the bucket enforces the same limits). */
export function logoFileError(file: { type: string; size: number }) {
  if (!LOGO_TYPES.includes(file.type as (typeof LOGO_TYPES)[number])) return 'settings.errors.logoType';
  if (file.size > LOGO_MAX_BYTES) return 'settings.errors.logoSize';

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
      skipped.push({ line, reason: keyed('settings.errors.icd10BadCode', { code: rawCode.trim() }) });
    } else if (!name) {
      skipped.push({ line, reason: keyed('settings.errors.icd10NoName', { code }) });
    } else {
      byCode.set(code, { code, name: name.slice(0, 500), name_id: rawNameId.trim().slice(0, 500) || null });
    }
  });

  return { rows: [...byCode.values()], skipped };
}

// Activity log ---------------------------------------------------------------------

const IGNORED_FIELDS = new Set(['updated_at', 'created_at', 'id', 'clinic_id']);

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** A before/after value, classified so the screen can word it in the reader's language. */
export type AuditValue =
  | { kind: 'empty' }
  | { kind: 'active' | 'yes'; value: boolean }
  | { kind: 'time'; value: string }
  | { kind: 'role'; value: Role }
  | { kind: 'code'; value: (typeof AUDIT_VALUE_CODES)[number] }
  | { kind: 'text'; value: string };

function classify(field: string, value: unknown): AuditValue {
  if (value === null || value === undefined || value === '') return { kind: 'empty' };
  if (field === 'is_active') return { kind: 'active', value: Boolean(value) };
  if (typeof value === 'boolean') return { kind: 'yes', value };
  if (typeof value === 'string' && TIMESTAMP.test(value)) return { kind: 'time', value };

  if (field === 'role' && typeof value === 'string' && Object.hasOwn(ROLE_LABELS, value))
    return { kind: 'role', value: value as Role };

  if (typeof value === 'string' && (AUDIT_VALUE_CODES as readonly string[]).includes(value))
    return { kind: 'code', value: value as (typeof AUDIT_VALUE_CODES)[number] };

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);

  return { kind: 'text', value: text.length > 60 ? `${text.slice(0, 57)}...` : text };
}

export type AuditChange = {
  field: string;
  from: AuditValue;
  to: AuditValue;
  /** A reference (…_id, …_by): which row, not a readable value. */
  ref: boolean;
};

/** Fields that changed in an update (timestamps and ids ignored). */
export function changedFields(before: unknown, after: unknown): AuditChange[] {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];

  const oldRow = before as Record<string, unknown>;
  const newRow = after as Record<string, unknown>;

  return Object.keys(newRow)
    .filter((key) => !IGNORED_FIELDS.has(key) && JSON.stringify(oldRow[key]) !== JSON.stringify(newRow[key]))
    .map((key) => ({
      field: key,
      from: classify(key, oldRow[key]),
      to: classify(key, newRow[key]),
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
