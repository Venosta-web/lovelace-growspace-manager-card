import { describe, expect, it } from 'vitest';
import { nextScheduleTime, todayISO } from './local-date-time';

describe('Home Assistant calendar time', () => {
  it('uses the configured time zone for the date at the same instant', () => {
    const now = new Date('2026-03-29T22:30:00Z');
    expect(todayISO(now, 'Europe/Berlin')).toBe('2026-03-30');
    expect(todayISO(now, 'America/New_York')).toBe('2026-03-29');
  });

  it('selects the next schedule across local midnight', () => {
    const now = new Date('2026-01-10T23:45:00Z');
    expect(nextScheduleTime([{ time: '23:30' }, { start_time: '00:15' }], now, 'UTC')).toBe(
      '00:15'
    );
  });

  it('accepts the backend HH:mm:ss schedule form', () => {
    expect(
      nextScheduleTime([{ start_time: '08:30:00' }], new Date('2026-01-10T07:00:00Z'), 'UTC')
    ).toBe('08:30');
  });

  it('uses local wall time on either side of the spring DST boundary', () => {
    const times = [{ time: '03:30' }, { time: '01:30' }];
    expect(nextScheduleTime(times, new Date('2026-03-29T00:45:00Z'), 'Europe/Berlin')).toBe(
      '03:30'
    );
    expect(nextScheduleTime(times, new Date('2026-03-29T01:15:00Z'), 'Europe/Berlin')).toBe(
      '03:30'
    );
  });

  it('normalizes a schedule inside the skipped spring hour forward', () => {
    expect(
      nextScheduleTime([{ time: '02:30' }], new Date('2026-03-29T00:45:00Z'), 'Europe/Berlin')
    ).toBe('03:30');
  });

  it('uses local wall time on either side of the fall DST boundary', () => {
    const times = [{ time: '03:30' }, { time: '02:30' }];
    expect(nextScheduleTime(times, new Date('2026-10-25T00:15:00Z'), 'Europe/Berlin')).toBe(
      '02:30'
    );
    expect(nextScheduleTime(times, new Date('2026-10-25T01:15:00Z'), 'Europe/Berlin')).toBe(
      '02:30'
    );
  });

  it('finds the second occurrence of a schedule in the repeated fall hour', () => {
    expect(
      nextScheduleTime([{ time: '02:30' }], new Date('2026-10-25T01:15:00Z'), 'Europe/Berlin')
    ).toBe('02:30');
  });
});
