import { describe, expect, it } from 'vitest';
import { keyed } from '@/i18n/keyed';
import { parseImportRows, sameAsSaved } from './data-import.lib';

function rows(result: ReturnType<typeof parseImportRows>) {
  if ('error' in result) throw new Error(result.error);

  return result.rows;
}

describe('parseImportRows', () => {
  it('finds columns by header text in any order and keeps Excel line numbers', () => {
    const parsed = rows(
      parseImportRows('medicines', [
        ['Satuan *', 'Nama obat *', 'Stok minimum *', 'Harga jual *'],
        ['Tablet', 'Paracetamol 500 mg', '100', '500'],
        [],
        ['kapsul', 'Amoxicillin 500 mg', '50', '1.200'],
      ]),
    );

    expect(parsed).toHaveLength(2);

    expect(parsed[0]).toMatchObject({
      line: 2,
      ok: true,
      values: { name: 'Paracetamol 500 mg', unit: 'tablet', price: 500, min_stock: 100, kfa_code: null },
    });

    expect(parsed[1]).toMatchObject({ line: 4, ok: true, values: { price: 1200 } });
  });

  it('reports schema errors and repeated names per row', () => {
    const parsed = rows(
      parseImportRows('medicines', [
        ['Nama obat', 'Satuan', 'Harga jual', 'Stok minimum'],
        ['Paracetamol', '', 'abc', '1'],
        ['Antasida', 'tablet', '300', '10'],
        ['antasida', 'tablet', '300', '10'],
      ]),
    );

    expect(parsed[0]).toMatchObject({ ok: false });
    expect(parsed[0]!.ok === false && parsed[0]!.errors.length).toBe(2);
    expect(parsed[2]).toMatchObject({ ok: false, errors: [keyed('dataImport.errors.duplicateName', { line: 3 })] });
  });

  it('maps Indonesian labels for service type and doctor fee', () => {
    const parsed = rows(
      parseImportRows('services', [
        ['Nama layanan *', 'Jenis *', 'Tarif *', 'Jasa dokter', 'Nilai jasa dokter'],
        ['Jahit luka', 'Tindakan', '150000', 'Persentase', '30'],
        ['Konsultasi umum', 'konsultasi', '50000', '', ''],
        ['Paket MCU', 'Paket', '300000', '', ''],
      ]),
    );

    expect(parsed[0]).toMatchObject({
      ok: true,
      values: { type: 'procedure', doctor_fee_type: 'percent', doctor_fee_value: 30 },
    });

    expect(parsed[1]).toMatchObject({
      ok: true,
      values: { type: 'consultation', doctor_fee_type: 'none', doctor_fee_value: 0 },
    });

    expect(parsed[2]).toMatchObject({ ok: false });
  });

  it('rejects a sheet without the template header or with a required column missing', () => {
    expect(parseImportRows('suppliers', [['foo', 'bar']])).toHaveProperty('error');

    expect(parseImportRows('medicines', [['Nama obat', 'Satuan']])).toMatchObject({
      error: expect.stringContaining('Harga jual'),
    });
  });
});

describe('sameAsSaved', () => {
  it('ignores name case and treats blank as null', () => {
    const saved = { id: 'x', name: 'Antasida', unit: 'tablet', price: 300, kfa_code: null, is_active: true };

    expect(sameAsSaved({ name: 'antasida', unit: 'tablet', price: 300, kfa_code: null }, saved)).toBe(true);
    expect(sameAsSaved({ name: 'Antasida', unit: 'tablet', price: 350, kfa_code: null }, saved)).toBe(false);
  });
});
