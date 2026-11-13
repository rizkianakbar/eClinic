import { describe, expect, it } from 'vitest';
import {
  exportFileName,
  isExportReport,
  parseRange,
  parseReportTab,
  profitLossStatement,
  rangeDays,
  rangePresets,
} from './reports.lib';

describe('parseRange', () => {
  it('defaults to this month so far', () => {
    expect(parseRange({}, '2026-11-12')).toEqual({ from: '2026-11-01', to: '2026-11-12' });
  });

  it('accepts a valid range and rejects reversed, malformed or over-a-year ranges', () => {
    expect(parseRange({ from: '2026-10-01', to: '2026-10-31' }, '2026-11-12')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(parseRange({ from: '2026-11-10', to: '2026-11-01' }, '2026-11-12').from).toBe('2026-11-01');
    expect(parseRange({ from: 'nope', to: '2026-11-01' }, '2026-11-12').from).toBe('2026-11-01');
    expect(parseRange({ from: '2024-01-01', to: '2026-11-01' }, '2026-11-12').from).toBe('2026-11-01');
  });
});

describe('rangePresets', () => {
  it('computes last month across a year boundary', () => {
    const presets = rangePresets('2027-01-15');

    expect(presets.find((preset) => preset.label === 'Bulan lalu')).toEqual({
      label: 'Bulan lalu',
      from: '2026-12-01',
      to: '2026-12-31',
    });

    expect(presets.find((preset) => preset.label === '7 hari')).toEqual({
      label: '7 hari',
      from: '2027-01-09',
      to: '2027-01-15',
    });
  });
});

describe('parseReportTab', () => {
  it('falls back to revenue', () => {
    expect(parseReportTab('profit-loss')).toBe('profit-loss');
    expect(parseReportTab('x')).toBe('revenue');
  });
});

describe('exports', () => {
  it('knows the exportable reports and names files by range', () => {
    expect(isExportReport('top-diseases')).toBe(true);
    expect(isExportReport('constructor')).toBe(false);

    expect(exportFileName('top-diseases', { from: '2026-11-01', to: '2026-11-12' })).toBe(
      '10-besar-penyakit_2026-11-01_2026-11-12.xlsx',
    );
  });
});

describe('rangeDays', () => {
  it('lists every day, across month ends', () => {
    expect(rangeDays({ from: '2026-10-30', to: '2026-11-02' })).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });
});

describe('profitLossStatement', () => {
  it('derives gross profit and margins', () => {
    expect(
      profitLossStatement({ revenue: 1_000_000, medicine_cost: 200_000, expenses: 500_000, profit: 300_000 }),
    ).toEqual({
      revenue: 1_000_000,
      medicineCost: 200_000,
      gross: 800_000,
      grossMargin: 80,
      expenses: 500_000,
      net: 300_000,
      netMargin: 30,
    });

    expect(profitLossStatement({ revenue: 0, medicine_cost: 0, expenses: 10, profit: -10 }).netMargin).toBeNull();
  });
});
