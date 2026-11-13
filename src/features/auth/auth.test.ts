import { describe, expect, it } from 'vitest';
import { changePasswordErrorMessage, changePasswordSchema, signInSchema } from './auth.lib';

describe('signInSchema', () => {
  it('trims and lowercases the email', () => {
    const result = signInSchema.parse({ email: '  Dokter@Klinik.Test ', password: 'secret' });

    expect(result.email).toBe('dokter@klinik.test');
  });

  it('requires both fields, with message keys', () => {
    const result = signInSchema.safeParse({ email: '', password: '' });

    expect(result.success).toBe(false);

    const messages = result.error?.issues.map((issue) => issue.message);

    expect(messages).toContain('auth.errors.emailRequired');
    expect(messages).toContain('auth.errors.passwordRequired');
  });

  it('rejects an invalid email', () => {
    const result = signInSchema.safeParse({ email: 'bukan-email', password: 'x' });

    expect(result.error?.issues[0]?.message).toBe('auth.errors.emailInvalid');
  });
});

describe('changePasswordSchema', () => {
  const valid = { current_password: 'lama-123', password: 'baru-12345', confirm: 'baru-12345' };

  it('accepts a new, confirmed password', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a matching confirmation, a different and long enough password', () => {
    const messages = (input: typeof valid) =>
      changePasswordSchema.safeParse(input).error?.issues.map((issue) => issue.message);

    expect(messages({ ...valid, confirm: 'lain' })).toContain('auth.errors.confirmMismatch');

    expect(messages({ ...valid, password: 'lama-123', confirm: 'lama-123' })).toContain('auth.errors.sameAsCurrent');

    expect(messages({ ...valid, password: 'pendek', confirm: 'pendek' })).toContain('auth.errors.newMin');
  });

  it('maps auth errors', () => {
    expect(changePasswordErrorMessage({ code: 'invalid_credentials' })).toBe('auth.errors.currentWrong');
    expect(changePasswordErrorMessage({})).toBe('auth.errors.changeFailed');
  });
});
