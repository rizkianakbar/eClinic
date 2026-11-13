import { describe, expect, it } from 'vitest';
import {
  ageInYears,
  escapeLike,
  formatIdNumber,
  formatPhone,
  initials,
  normalizePhone,
  parsePatientSearch,
  patientSchema,
  patientWriteErrorMessage,
} from './patients.lib';

const valid = {
  full_name: '  Siti Aminah ',
  nik: '3276011234560001',
  bpjs_number: '',
  birth_date: '1990-05-17',
  sex: 'female' as const,
  phone: '+62 812-3456-7890',
  address: ' ',
};

describe('patientSchema', () => {
  it('trims, normalizes the phone and turns blanks into null', () => {
    expect(patientSchema.parse(valid)).toEqual({
      full_name: 'Siti Aminah',
      nik: '3276011234560001',
      bpjs_number: null,
      birth_date: '1990-05-17',
      sex: 'female',
      phone: '081234567890',
      address: null,
    });
  });

  it('rejects a NIK that is not 16 digits', () => {
    const result = patientSchema.safeParse({ ...valid, nik: '12345' });

    expect(result.error?.issues[0]?.message).toBe('patients.errors.nik');
  });

  it('rejects a BPJS number that is not 13 digits', () => {
    const result = patientSchema.safeParse({ ...valid, bpjs_number: '0001234' });

    expect(result.error?.issues[0]?.message).toBe('patients.errors.bpjs');
  });

  it('requires name, birth date and sex', () => {
    const result = patientSchema.safeParse({ ...valid, full_name: '', birth_date: '', sex: '' });
    const messages = result.error?.issues.map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining(['patients.errors.nameRequired', 'patients.errors.birthRequired', 'patients.errors.sex']),
    );
  });

  it('rejects a birth date in the future', () => {
    const result = patientSchema.safeParse({ ...valid, birth_date: '2999-01-01' });

    expect(result.error?.issues[0]?.message).toBe('patients.errors.birthFuture');
  });

  it('rejects an invalid phone', () => {
    const result = patientSchema.safeParse({ ...valid, phone: '123' });

    expect(result.error?.issues[0]?.message).toBe('patients.errors.phone');
  });
});

describe('normalizePhone', () => {
  it('converts the +62 prefix to 0 and strips separators', () => {
    expect(normalizePhone('+62 812-3456-7890')).toBe('081234567890');
    expect(normalizePhone('0812 3456 7890')).toBe('081234567890');
  });
});

describe('parsePatientSearch', () => {
  it('ignores input shorter than 2 characters', () => {
    expect(parsePatientSearch(' a ')).toBeNull();
    expect(parsePatientSearch('')).toBeNull();
  });

  it('treats digits as a number search, keeping the raw digits for MRN/NIK', () => {
    expect(parsePatientSearch('000123')).toEqual({ kind: 'number', digits: '000123', phone: '000123' });
    expect(parsePatientSearch('+62 812')).toEqual({ kind: 'number', digits: '62812', phone: '0812' });
  });

  it('treats anything else as a name search', () => {
    expect(parsePatientSearch(' siti ')).toEqual({ kind: 'name', text: 'siti' });
  });
});

describe('escapeLike', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});

describe('ageInYears', () => {
  it('counts a birthday only once it has passed', () => {
    expect(ageInYears('1990-05-17', '2026-05-16')).toBe(35);
    expect(ageInYears('1990-05-17', '2026-05-17')).toBe(36);
  });
});

describe('patientWriteErrorMessage', () => {
  it('explains duplicate NIK and BPJS numbers', () => {
    expect(
      patientWriteErrorMessage({ code: '23505', message: 'violates unique constraint "patients_clinic_nik_key"' }),
    ).toBe('patients.errors.nikTaken');

    expect(
      patientWriteErrorMessage({ code: '23505', message: 'violates unique constraint "patients_clinic_bpjs_key"' }),
    ).toBe('patients.errors.bpjsTaken');
  });

  it('falls back to a generic message', () => {
    expect(patientWriteErrorMessage({ code: 'XX000' })).toBe('patients.errors.failed');
  });
});

describe('patientSchema re-validation', () => {
  it('accepts its own output, so the action can re-check parsed form values', () => {
    const parsed = patientSchema.parse(valid);

    expect(patientSchema.parse(parsed)).toEqual(parsed);
  });
});

describe('initials', () => {
  it('takes two letters, skipping titles and test markers', () => {
    expect(initials('Siti Nurhaliza (Uji)')).toBe('SN');
    expect(initials('dr. Budi Santoso')).toBe('BS');
    expect(initials('Apt. Dewi')).toBe('D');
    expect(initials('Ani')).toBe('A');
  });
});

describe('formatPhone / formatIdNumber', () => {
  it('groups Indonesian mobile numbers 4-4-rest and leaves other shapes', () => {
    expect(formatPhone('081234567890')).toBe('0812-3456-7890');
    expect(formatPhone('0215551234')).toBe('0215551234');
    expect(formatPhone('+62 812')).toBe('+62 812');
  });

  it('groups long ID numbers by four', () => {
    expect(formatIdNumber('3276010101010001')).toBe('3276 0101 0101 0001');
    expect(formatIdNumber('0001234567890')).toBe('0001 2345 6789 0');
    expect(formatIdNumber('12345')).toBe('12345');
  });
});
