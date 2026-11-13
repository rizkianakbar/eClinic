/** Tables that write to audit_logs (names in messages: audit.tables.*). */
export const AUDIT_TABLES = [
  'clinics',
  'profiles',
  'polis',
  'doctor_schedules',
  'patients',
  'visits',
  'medicines',
  'suppliers',
  'services',
  'service_package_items',
  'purchases',
  'stock_opnames',
  'invoices',
  'invoice_items',
  'payments',
  'expenses',
] as const;

export type AuditTable = (typeof AUDIT_TABLES)[number];

export const isAuditTable = (table: string): table is AuditTable => (AUDIT_TABLES as readonly string[]).includes(table);

export const AUDIT_ACTIONS = ['insert', 'update', 'delete'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_PAGE_SIZE = 50;

/** Stored codes the activity log words for staff (messages: audit.values.*); other values show as stored. */
export const AUDIT_VALUE_CODES = [
  'draft',
  'paid',
  'void',
  'registered',
  'waiting',
  'in_exam',
  'to_pharmacy',
  'to_cashier',
  'done',
  'cancelled',
  'cash',
  'qris',
  'transfer',
  'umum',
  'bpjs',
  'consultation',
  'procedure',
  'other',
  'package',
  'none',
  'fixed',
  'percent',
  'male',
  'female',
] as const;
