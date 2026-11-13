import { describe, expect, it } from 'vitest';
import { keyed } from '@/i18n/keyed';
import {
  assignableRoles,
  auditSubject,
  changedFields,
  clinicProfileSchema,
  groupAuditLogs,
  logoFileError,
  masterDataErrorMessage,
  normalizeIcd10Code,
  parseIcd10Rows,
  poliSchema,
  staffAuthErrorMessage,
  staffCreateSchema,
  staffSchema,
} from './settings.lib';

describe('staffCreateSchema', () => {
  const valid = {
    full_name: ' dr. Budi Santoso ',
    email: ' Dokter@Klinik.COM ',
    password: 'rahasia123',
    role: 'doctor' as const,
    nik: '',
    sip_number: ' 503/SIP/2026 ',
  };

  it('trims, lowercases the email and turns blanks into null', () => {
    expect(staffCreateSchema.parse(valid)).toEqual({
      full_name: 'dr. Budi Santoso',
      email: 'dokter@klinik.com',
      password: 'rahasia123',
      role: 'doctor',
      nik: null,
      sip_number: '503/SIP/2026',
    });
  });

  it('requires a password of at least 8 characters', () => {
    const result = staffCreateSchema.safeParse({ ...valid, password: '1234567' });

    expect(result.error?.issues[0]?.message).toBe('settings.errors.passwordMin');
  });

  it('rejects an unknown role', () => {
    const result = staffCreateSchema.safeParse({ ...valid, role: '' });

    expect(result.error?.issues[0]?.message).toBe('settings.errors.pickRole');
  });

  it('rejects a NIK that is not 16 digits', () => {
    const result = staffSchema.safeParse({ ...valid, nik: '123' });

    expect(result.error?.issues[0]?.message).toBe('settings.errors.nik');
  });

  it('accepts its own output, so the action can re-check parsed form values', () => {
    const parsed = staffSchema.parse(valid);

    expect(staffSchema.parse(parsed)).toEqual(parsed);
  });
});

describe('assignableRoles', () => {
  it('lets only an owner assign the owner role', () => {
    expect(assignableRoles('owner')).toContain('owner');
    expect(assignableRoles('admin')).not.toContain('owner');
    expect(assignableRoles('admin')).toContain('doctor');
  });
});

describe('poliSchema', () => {
  it('requires a name and makes the BPJS code optional', () => {
    expect(poliSchema.parse({ name: ' Poli Umum ', bpjs_poli_code: '', consultation_service_id: '' })).toEqual({
      name: 'Poli Umum',
      bpjs_poli_code: null,
      consultation_service_id: null,
    });

    expect(poliSchema.safeParse({ name: '', bpjs_poli_code: '' }).error?.issues[0]?.message).toBe(
      'settings.errors.poliNameRequired',
    );
  });
});

describe('error messages', () => {
  it('explains a duplicate email', () => {
    expect(staffAuthErrorMessage({ code: 'email_exists' })).toBe('settings.errors.emailTaken');
  });

  it("uses the caller's duplicate message for unique violations", () => {
    expect(masterDataErrorMessage({ code: '23505' }, 'errors.duplicate.poli')).toBe('errors.duplicate.poli');
    expect(masterDataErrorMessage({ code: '42501' }, '')).toBe('errors.noAccessMaster');
  });
});

describe('clinicProfileSchema and logoFileError', () => {
  it('normalizes the profile', () => {
    expect(
      clinicProfileSchema.parse({
        name: ' Klinik ',
        address: '',
        phone: '',
        email: ' A@B.COM ',
        license_no: '',
        idle_logout_minutes: '15',
      }),
    ).toEqual({
      name: 'Klinik',
      address: null,
      phone: null,
      email: 'a@b.com',
      license_no: null,
      idle_logout_minutes: 15,
    });
  });

  it('checks logo type and size', () => {
    expect(logoFileError({ type: 'image/gif', size: 10 })).toBe('settings.errors.logoType');
    expect(logoFileError({ type: 'image/png', size: 2 * 1024 * 1024 })).toBe('settings.errors.logoSize');
    expect(logoFileError({ type: 'image/png', size: 1000 })).toBeNull();
  });
});

describe('ICD-10 import', () => {
  it('normalizes codes', () => {
    expect(normalizeIcd10Code(' j069 ')).toBe('J06.9');
    expect(normalizeIcd10Code('J06.9')).toBe('J06.9');
    expect(normalizeIcd10Code('A09')).toBe('A09');
    expect(normalizeIcd10Code('123')).toBeNull();
  });

  it('skips the header, reports bad rows with line numbers and de-duplicates', () => {
    const result = parseIcd10Rows([
      ['Kode', 'Nama', 'Nama Indonesia'],
      ['J06.9', 'Acute upper respiratory infection', 'ISPA'],
      ['XX', 'Bad', ''],
      ['A09', '', ''],
      ['', '', ''],
      ['j069', 'Acute URI (updated)', ''],
    ]);

    expect(result.rows).toEqual([{ code: 'J06.9', name: 'Acute URI (updated)', name_id: null }]);

    expect(result.skipped).toEqual([
      { line: 3, reason: keyed('settings.errors.icd10BadCode', { code: 'XX' }) },
      { line: 4, reason: keyed('settings.errors.icd10NoName', { code: 'A09' }) },
    ]);
  });
});

describe('changedFields', () => {
  it('lists changed fields, ignoring timestamps', () => {
    expect(
      changedFields(
        { name: 'Paracetamol', price: 500, updated_at: 'a', is_active: true },
        { name: 'Paracetamol', price: 600, updated_at: 'b', is_active: false },
      ),
    ).toEqual([
      { field: 'price', from: { kind: 'text', value: '500' }, to: { kind: 'text', value: '600' }, ref: false },
      {
        field: 'is_active',
        from: { kind: 'active', value: true },
        to: { kind: 'active', value: false },
        ref: false,
      },
    ]);

    expect(changedFields(null, { a: 1 })).toEqual([]);

    expect(changedFields({ poli_id: 'a', note: null }, { poli_id: 'b', note: 'x' })).toEqual([
      { field: 'poli_id', from: { kind: 'text', value: 'a' }, to: { kind: 'text', value: 'b' }, ref: true },
      { field: 'note', from: { kind: 'empty' }, to: { kind: 'text', value: 'x' }, ref: false },
    ]);

    expect(changedFields({ status: 'draft' }, { status: 'paid' })).toEqual([
      { field: 'status', from: { kind: 'code', value: 'draft' }, to: { kind: 'code', value: 'paid' }, ref: false },
    ]);
  });
});

describe('auditSubject', () => {
  it('names the row from after, falling back to before', () => {
    expect(auditSubject(null, { name: 'Antasida' })).toBe('Antasida');
    expect(auditSubject({ full_name: 'Budi' }, null)).toBe('Budi');
    expect(auditSubject({ qty: 1 }, { qty: 2 })).toBeNull();
  });
});

describe('groupAuditLogs', () => {
  const log = (actor: string, at: string, table = 'medicines') => ({
    actor_id: actor,
    action: 'insert',
    table_name: table,
    created_at: at,
  });

  it('folds a burst by one person on one table, splits on a gap or a different table', () => {
    const groups = groupAuditLogs([
      log('a', '2026-11-12T10:05:00Z'),
      log('a', '2026-11-12T10:04:30Z'),
      log('a', '2026-11-12T10:03:30Z'),
      log('a', '2026-11-12T10:03:20Z', 'suppliers'),
      log('a', '2026-11-12T09:00:00Z', 'suppliers'),
    ]);

    expect(groups.map((group) => group.length)).toEqual([3, 1, 1]);
  });
});
