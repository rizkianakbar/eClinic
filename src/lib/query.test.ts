import { describe, expect, it } from 'vitest';
import { isNavigationSignal, unwrap } from './query';

describe('isNavigationSignal', () => {
  it('recognises Next.js redirect and not-found signals only', () => {
    expect(
      isNavigationSignal(Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })),
    ).toBe(true);

    expect(isNavigationSignal(Object.assign(new Error('x'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }))).toBe(true);
    expect(isNavigationSignal(new Error('Stok tidak cukup.'))).toBe(false);
    expect(isNavigationSignal(null)).toBe(false);
  });
});

describe('unwrap', () => {
  it("returns data or throws the action's message", () => {
    expect(unwrap({ ok: true, data: 1 })).toBe(1);
    expect(() => unwrap({ ok: false, error: 'Gagal.' })).toThrow('Gagal.');
  });
});
