import { describe, expect, it } from 'vitest';
import { scheduleErrorMessage, scheduleSchema, toHourMinute, toScheduleRows } from './schedules.lib';

const valid = {
  doctor_id: '6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11',
  poli_id: '0c6a3f2e-7d4b-4c1e-8a59-3b2d1e0f9c77',
  days: ['3', '1', '2', '1'],
  start_time: '08:00',
  end_time: '12:00',
  quota: '20',
};

describe('scheduleSchema', () => {
  it('coerces select and number inputs', () => {
    expect(scheduleSchema.parse(valid)).toEqual({ ...valid, days: [1, 2, 3], quota: 20 });
  });

  it('accepts Postgres time values when editing', () => {
    expect(scheduleSchema.parse({ ...valid, start_time: '08:00:00', end_time: '12:30:00' })).toMatchObject({
      start_time: '08:00',
      end_time: '12:30',
    });
  });

  it('rejects an end time not after the start time', () => {
    const result = scheduleSchema.safeParse({ ...valid, start_time: '12:00', end_time: '12:00' });

    expect(result.error?.issues[0]).toMatchObject({
      message: 'schedules.errors.endAfterStart',
      path: ['end_time'],
    });
  });

  it('requires at least one day, a doctor and a poli', () => {
    const result = scheduleSchema.safeParse({ ...valid, days: [], doctor_id: '', poli_id: '' });
    const messages = result.error?.issues.map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining(['schedules.errors.oneDay', 'schedules.errors.pickDoctor', 'schedules.errors.pickPoli']),
    );
  });

  it('bounds the quota', () => {
    expect(scheduleSchema.safeParse({ ...valid, quota: '0' }).error?.issues[0]?.message).toBe(
      'schedules.errors.quotaMin',
    );

    expect(scheduleSchema.safeParse({ ...valid, quota: '501' }).error?.issues[0]?.message).toBe(
      'schedules.errors.quotaMax',
    );
  });
});

describe('toHourMinute', () => {
  it('drops seconds', () => {
    expect(toHourMinute('08:00:00')).toBe('08:00');
  });
});

describe('scheduleErrorMessage', () => {
  it('explains an overlapping session', () => {
    expect(scheduleErrorMessage({ code: '23P01' })).toBe('schedules.errors.overlap');
  });
});

describe('toScheduleRows', () => {
  it('creates one row per selected day with the same session', () => {
    const rows = toScheduleRows(scheduleSchema.parse(valid));

    expect(rows.map((row) => row.day_of_week)).toEqual([1, 2, 3]);
    expect(rows.every((row) => row.start_time === '08:00' && row.quota === 20)).toBe(true);
    expect(rows[0]).not.toHaveProperty('days');
  });
});
