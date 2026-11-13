import { describe, expect, it } from 'vitest';
import { formatRupiah, formatRupiahCompact, parseRupiah, rupiahField } from './money';

describe('formatRupiah', () => {
  it('formats with Indonesian thousand separators and no decimals', () => {
    expect(formatRupiah(150000)).toBe('Rp\u00a0150.000');
    expect(formatRupiah(0)).toBe('Rp\u00a00');
    expect(formatRupiah(1250000000)).toBe('Rp\u00a01.250.000.000');
  });

  it('formats negative amounts', () => {
    expect(formatRupiah(-5000)).toBe('-Rp\u00a05.000');
  });

  it('rejects non-integers', () => {
    expect(() => formatRupiah(1.5)).toThrow(RangeError);
  });
});

describe('parseRupiah', () => {
  it('parses formatted and plain input', () => {
    expect(parseRupiah('Rp 150.000')).toBe(150000);
    expect(parseRupiah('150000')).toBe(150000);
    expect(parseRupiah('-5.000')).toBe(-5000);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseRupiah('')).toBeNull();
    expect(parseRupiah('abc')).toBeNull();
  });
});

describe('rupiahField', () => {
  const field = rupiahField();

  it('parses formatted input and passes numbers through', () => {
    expect(field.parse('Rp 15.000')).toBe(15000);
    expect(field.parse(15000)).toBe(15000);
  });

  it('rejects blanks and negatives with a message', () => {
    expect(field.safeParse('').error?.issues[0]?.message).toBe('validation.amountNumber');
    expect(field.safeParse('-5').error?.issues[0]?.message).toBe('validation.amountNegative');
  });
});

describe('formatRupiahCompact', () => {
  it('shortens to rb / jt', () => {
    expect(formatRupiahCompact(650_000)).toBe('Rp\u00a0650\u00a0rb');
    expect(formatRupiahCompact(1_250_000)).toBe('Rp\u00a01,3\u00a0jt');
    expect(formatRupiahCompact(1_250_000, 'en')).toBe('Rp\u00a01.3M');
    expect(formatRupiahCompact(0)).toBe('Rp\u00a00');
  });
});
