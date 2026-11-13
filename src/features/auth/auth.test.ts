import { describe, expect, it } from 'vitest';
import { changePasswordErrorMessage, changePasswordSchema, signInSchema } from './auth.lib';

describe('signInSchema', () => {
  it('trims and lowercases the email', () => {
    const result = signInSchema.parse({ email: '  Dokter@Klinik.Test ', password: 'secret' });

    expect(result.email).toBe('dokter@klinik.test');
  });

  it('requires both fields with Indonesian messages', () => {
    const result = signInSchema.safeParse({ email: '', password: '' });

    expect(result.success).toBe(false);

    const messages = result.error?.issues.map((issue) => issue.message);

    expect(messages).toContain('Email wajib diisi.');
    expect(messages).toContain('Kata sandi wajib diisi.');
  });

  it('rejects an invalid email', () => {
    const result = signInSchema.safeParse({ email: 'bukan-email', password: 'x' });

    expect(result.error?.issues[0]?.message).toMatch(/Format email tidak valid/);
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

    expect(messages({ ...valid, confirm: 'lain' })).toContain('Konfirmasi tidak sama dengan kata sandi baru.');

    expect(messages({ ...valid, password: 'lama-123', confirm: 'lama-123' })).toContain(
      'Kata sandi baru harus berbeda dari yang sekarang.',
    );

    expect(messages({ ...valid, password: 'pendek', confirm: 'pendek' })).toContain(
      'Kata sandi baru minimal 8 karakter.',
    );
  });

  it('maps auth errors', () => {
    expect(changePasswordErrorMessage({ code: 'invalid_credentials' })).toMatch(/saat ini salah/);
    expect(changePasswordErrorMessage({})).toMatch(/gagal diganti/);
  });
});
