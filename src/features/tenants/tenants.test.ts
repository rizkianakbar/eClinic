import { describe, expect, it } from 'vitest';
import { looksAutomated, passwordStrength, SIGNUP_MIN_FILL_MS, signupSchema } from './tenants.lib';

const VALID = {
  full_name: 'dr. Andi Wijaya',
  company_name: ' Klinik Sehat Sentosa ',
  branch_name: ' Cabang Depok ',
  slug: 'Sehat-Sentosa',
  email: 'Andi@Sehat.test',
  password: 'rahasia123',
};

describe('signupSchema', () => {
  it('keeps the company and its first branch apart, trimmed', () => {
    expect(signupSchema.parse(VALID)).toMatchObject({
      company_name: 'Klinik Sehat Sentosa',
      branch_name: 'Cabang Depok',
      slug: 'sehat-sentosa',
      email: 'andi@sehat.test',
      locale: 'id',
    });
  });

  it('needs a name for the first branch', () => {
    const result = signupSchema.safeParse({ ...VALID, branch_name: '  ' });

    expect(result.error?.issues[0]?.message).toBe('tenants.errors.branchNameRequired');
  });

  it('refuses a reserved address', () => {
    const result = signupSchema.safeParse({ ...VALID, slug: 'clinic' });

    expect(result.error?.issues[0]?.message).toBe('tenants.errors.slug.reserved');
  });
});

describe('looksAutomated', () => {
  const now = 1_000_000;

  it('lets a person through', () => {
    expect(looksAutomated({ website: '', startedAt: now - SIGNUP_MIN_FILL_MS - 1 }, now)).toBe(false);
  });

  it('stops a filled honeypot, an instant submit, or a missing timestamp', () => {
    expect(looksAutomated({ website: 'http://spam.test', startedAt: now - 60_000 }, now)).toBe(true);
    expect(looksAutomated({ website: '', startedAt: now - 500 }, now)).toBe(true);
    expect(looksAutomated({}, now)).toBe(true);
  });
});

describe('passwordStrength', () => {
  it('grows with length and variety', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc12')).toBe(1);
    expect(passwordStrength('abcdefgh')).toBe(2);
    expect(passwordStrength('sentosa2026')).toBe(3);
    expect(passwordStrength('a long passphrase')).toBe(3);
  });
});
