import { describe, expect, it } from 'vitest';
import { formatRupiah, formatRupiahCompact, parseRupiah, rupiahField } from './money';

describe('formatRupiah', () => {
  it('formats with Indonesian thousand separators and no decimals', () => {
    expect(formatRupiah(150000)).toBe('Rp 150.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(1250000000)).toBe('Rp 1.250.000.000');
  });

  it('formats negative amounts', () => {
    expect(formatRupiah(-5000)).toBe('-Rp 5.000');
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
  const field = rupiahField('Harga');

  it('parses formatted input and passes numbers through', () => {
    expect(field.parse('Rp 15.000')).toBe(15000);
    expect(field.parse(15000)).toBe(15000);
  });

  it('rejects blanks and negatives with a message', () => {
    expect(field.safeParse('').error?.issues[0]?.message).toBe('Harga wajib diisi dengan angka, contoh: 15000.');
    expect(field.safeParse('-5').error?.issues[0]?.message).toBe('Harga tidak boleh negatif.');
  });
});

describe('formatRupiahCompact', () => {
  it('shortens to rb / jt', () => {
    expect(formatRupiahCompact(650_000)).toBe('Rp 650 rb');
    expect(formatRupiahCompact(1_250_000)).toBe('Rp 1,3 jt');
    expect(formatRupiahCompact(0)).toBe('Rp 0');
  });
});
