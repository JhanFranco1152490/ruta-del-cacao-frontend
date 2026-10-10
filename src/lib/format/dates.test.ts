import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  daysBetween,
  formatLongDate,
  formatMonthYear,
  formatTimestamp,
  formatWeekdayDate,
  formatWeekdayLongDate,
  isIsoMonth,
  monthBounds,
  shiftDays,
  shiftMonth,
  todayInBogota,
} from './dates';

afterEach(() => vi.useRealTimers());

describe('todayInBogota', () => {
  it('uses the Bogotá calendar day, not the UTC one', () => {
    vi.useFakeTimers();
    // 03:30 UTC del 25 son las 22:30 del 24 en Bogotá (UTC-5).
    vi.setSystemTime(new Date('2026-09-25T03:30:00Z'));

    expect(todayInBogota()).toBe('2026-09-24');
  });
});

describe('formatLongDate', () => {
  it('formats a date-only value in Spanish without shifting the day', () => {
    expect(formatLongDate('2026-09-24')).toBe('24 de septiembre de 2026');
  });
});

describe('formatMonthYear', () => {
  it('formats a year and month in Spanish', () => {
    expect(formatMonthYear('2021-03')).toBe('marzo de 2021');
    expect(formatMonthYear('2024-12')).toBe('diciembre de 2024');
  });
});

describe('formatTimestamp', () => {
  it('shows a saved instant with the Bogotá time', () => {
    // 17:05 UTC son las 12:05 en Bogotá.
    expect(formatTimestamp(Date.UTC(2026, 9, 7, 17, 5))).toBe(
      '7 de octubre de 2026, 12:05 p.m.',
    );
  });
});

describe('daysBetween', () => {
  it('counts calendar days from one date to a later one', () => {
    expect(daysBetween('2026-10-20', '2026-10-20')).toBe(0);
    expect(daysBetween('2026-10-20', '2026-10-23')).toBe(3);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-10-20', '2026-10-18')).toBe(-2);
  });
});

describe('monthBounds', () => {
  it('gives the first and the last day of a month', () => {
    expect(monthBounds('2026-10')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(monthBounds('2026-12')).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('knows a leap February', () => {
    expect(monthBounds('2027-02').to).toBe('2027-02-28');
    expect(monthBounds('2028-02').to).toBe('2028-02-29');
  });
});

describe('isIsoMonth', () => {
  it('accepts a year and a month', () => {
    expect(isIsoMonth('2026-10')).toBe(true);
    expect(isIsoMonth('2026-01')).toBe(true);
  });

  it('rejects anything else', () => {
    for (const value of ['2026-13', '2026-00', '2026-1', '26-10', 'zzz', '']) {
      expect(isIsoMonth(value)).toBe(false);
    }
    expect(isIsoMonth('2026-10-05')).toBe(false);
  });
});

describe('shiftMonth', () => {
  it('moves forward and back across a year', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
  });
});

describe('formatWeekdayDate', () => {
  it('names the weekday in Spanish without shifting the day', () => {
    expect(formatWeekdayDate('2026-10-19')).toBe('lunes 19 de octubre');
    expect(formatWeekdayDate('2026-11-01')).toBe('domingo 1 de noviembre');
  });
});

describe('shiftDays', () => {
  it('moves a date forward and back across a month and a year', () => {
    expect(shiftDays('2026-10-20', 3)).toBe('2026-10-23');
    expect(shiftDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(shiftDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});

describe('formatWeekdayLongDate', () => {
  it('names the weekday and the year', () => {
    expect(formatWeekdayLongDate('2026-10-22')).toBe(
      'jueves 22 de octubre de 2026',
    );
  });
});
