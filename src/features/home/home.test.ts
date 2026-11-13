import { describe, expect, it } from 'vitest';
import {
  clinicHours,
  dailySeries,
  dailyVisitCounts,
  greeting,
  jakartaClock,
  jakartaHour,
  paymentBreakdown,
  percentChange,
} from './home.lib';

describe('greeting', () => {
  it('follows the Indonesian time of day', () => {
    expect(greeting(7)).toBe('Selamat pagi');
    expect(greeting(12)).toBe('Selamat siang');
    expect(greeting(16)).toBe('Selamat sore');
    expect(greeting(20)).toBe('Selamat malam');
  });

  it('reads the hour in Jakarta', () => {
    expect(jakartaHour(new Date('2026-11-12T01:30:00Z'))).toBe(8);
  });
});

describe('paymentBreakdown', () => {
  it('sums umum payments per method and counts BPJS apart', () => {
    const result = paymentBreakdown([
      { total: 100_000, subtotal: 110_000, payer_type: 'umum', payments: [{ method: 'cash', amount: 100_000 }] },
      { total: 50_000, payer_type: 'umum', payments: [{ method: 'qris', amount: 50_000 }] },
      { total: 80_000, payer_type: 'bpjs', payments: [] },
    ]);

    expect(result).toEqual({
      total: 150_000,
      byMethod: { cash: 100_000, qris: 50_000, transfer: 0 },
      countByMethod: { cash: 1, qris: 1, transfer: 0 },
      discounts: 10_000,
      umum: 2,
      bpjs: 1,
    });
  });
});

describe('dailySeries', () => {
  it('fills missing days with zero', () => {
    expect(dailySeries([{ day: '2026-11-11', revenue: 5 }], ['2026-11-10', '2026-11-11'])).toEqual([
      { day: '2026-11-10', value: 0 },
      { day: '2026-11-11', value: 5 },
    ]);
  });
});

describe('percentChange', () => {
  it('compares with the previous value', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe('dailyVisitCounts', () => {
  it('counts visits per day, zero where none', () => {
    expect(
      dailyVisitCounts([{ visit_date: '2026-11-12' }, { visit_date: '2026-11-12' }], ['2026-11-11', '2026-11-12']),
    ).toEqual([
      { day: '2026-11-11', value: 0 },
      { day: '2026-11-12', value: 2 },
    ]);
  });
});

describe('clinicHours', () => {
  const sessions = [
    { startTime: '08:00:00', endTime: '14:00:00' },
    { startTime: '16:00:00', endTime: '21:00:00' },
  ];

  it('spans the earliest start to the latest end', () => {
    expect(clinicHours(sessions, '07:30')).toEqual({ state: 'before', from: '08:00', to: '21:00' });
    expect(clinicHours(sessions, '15:00')).toMatchObject({ state: 'open' });
    expect(clinicHours(sessions, '21:00')).toMatchObject({ state: 'after' });
    expect(clinicHours([], '10:00')).toEqual({ state: 'closed', from: null, to: null });
  });

  it('reads the clock in Jakarta', () => {
    expect(jakartaClock(new Date('2026-11-12T01:05:00Z'))).toBe('08:05');
  });
});
