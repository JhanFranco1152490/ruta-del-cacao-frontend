import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  dateInBogota,
  daysBetween,
  formatDayMonth,
  formatAbbreviatedDate,
  formatShortDate,
  formatShortDayMonth,
  formatLongDate,
  formatMonthYear,
  formatTimestamp,
  formatWeekdayDate,
  formatShortWeekdayDate,
  formatWeekdayLongDate,
  formatWeekRange,
  isIsoDate,
  isIsoMonth,
  monthBounds,
  monthDates,
  monthGridDates,
  monthsBetween,
  shiftDays,
  shiftMonth,
  todayInBogota,
  weekDates,
  weekdayIndex,
  weekStart,
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

describe('formatDayMonth', () => {
  it('writes the day and the month without the year or shifting the day', () => {
    expect(formatDayMonth('2026-10-19')).toBe('19 de octubre');
    expect(formatDayMonth('2026-11-01')).toBe('1 de noviembre');
  });
});

describe('formatShortDayMonth', () => {
  it('writes the day and the short month of a moment, in Bogotá', () => {
    expect(formatShortDayMonth('2026-10-19T15:20:00Z')).toBe('19 oct');
    // A las 2 de la mañana del 20 en UTC todavía es el 19 en Bogotá.
    expect(formatShortDayMonth('2026-10-20T02:00:00Z')).toBe('19 oct');
  });
});

describe('formatAbbreviatedDate', () => {
  it('writes the day and the short month with the period that closes the abbreviation', () => {
    expect(formatAbbreviatedDate('2026-10-14')).toBe('14 oct.');
    expect(formatAbbreviatedDate('2026-09-01')).toBe('1 sep.');
  });
});

describe('formatShortDate', () => {
  it('writes the day and the short month of a date without shifting it', () => {
    expect(formatShortDate('2026-10-20')).toBe('20 oct');
    expect(formatShortDate('2026-09-01')).toBe('1 sep');
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

describe('formatShortWeekdayDate', () => {
  it('writes the weekday, the day, the month and the year in a short line', () => {
    expect(formatShortWeekdayDate('2026-10-22')).toBe('jue 22 oct 2026');
    expect(formatShortWeekdayDate('2026-09-01')).toBe('mar 1 sep 2026');
  });
});

describe('formatWeekdayLongDate', () => {
  it('names the weekday and the year', () => {
    expect(formatWeekdayLongDate('2026-10-22')).toBe(
      'jueves 22 de octubre de 2026',
    );
  });
});

describe('isIsoDate', () => {
  it('accepts a date of the calendar', () => {
    expect(isIsoDate('2026-10-22')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('rejects a date that does not exist or is written another way', () => {
    for (const value of [
      '2026-02-30',
      '2027-02-29',
      '2026-13-01',
      '22/10/2026',
      '2026-10',
      '',
    ]) {
      expect(isIsoDate(value)).toBe(false);
    }
  });
});

describe('dateInBogota', () => {
  it('gives the Bogotá day of an instant, not the UTC one', () => {
    expect(dateInBogota('2026-10-09T02:00:00Z')).toBe('2026-10-08');
    expect(dateInBogota('2026-10-08T09:00:00-05:00')).toBe('2026-10-08');
    expect(dateInBogota('2026-10-09T05:00:00Z')).toBe('2026-10-09');
  });
});

describe('weekStart', () => {
  it('gives the Monday of the week of any day', () => {
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
    expect(weekStart('2026-10-14')).toBe('2026-10-12');
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
  });

  it('goes back across the end of a month and of a year', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });
});

describe('weekDates', () => {
  it('gives the seven days from Monday to Sunday', () => {
    expect(weekDates('2026-10-26')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });
});

describe('monthGridDates', () => {
  const flat = (month: string) => monthGridDates(month).flat();

  it('lays out whole weeks from Monday to Sunday', () => {
    const weeks = monthGridDates('2026-10');
    expect(weeks).toHaveLength(5);
    for (const week of weeks) expect(week).toHaveLength(7);
    expect(weeks[0][0]).toEqual({ date: '2026-09-28', inMonth: false });
    expect(weeks[0][3]).toEqual({ date: '2026-10-01', inMonth: true });
    expect(weeks[4][6]).toEqual({ date: '2026-11-01', inMonth: false });
  });

  it('adds a sixth week for a month that starts late in the week', () => {
    // Agosto de 2026 empieza en sábado y termina en lunes 31.
    expect(monthGridDates('2026-08')).toHaveLength(6);
  });

  it('needs only four weeks for a February that starts on Monday', () => {
    // Febrero de 2027 va del lunes 1 al domingo 28.
    const weeks = monthGridDates('2027-02');
    expect(weeks).toHaveLength(4);
    expect(flat('2027-02').every(({ inMonth }) => inMonth)).toBe(true);
  });

  it('handles a leap February and a month that starts on Sunday', () => {
    expect(flat('2028-02').filter(({ inMonth }) => inMonth)).toHaveLength(29);
    // Febrero de 2026 empieza en domingo: la primera semana trae seis días de enero.
    const weeks = monthGridDates('2026-02');
    expect(weeks[0][0].date).toBe('2026-01-26');
    expect(weeks[0][6]).toEqual({ date: '2026-02-01', inMonth: true });
  });

  it('crosses the end of the year in both directions', () => {
    const december = monthGridDates('2026-12');
    expect(december.at(-1)?.at(-1)?.date).toBe('2027-01-03');
    expect(monthGridDates('2027-01')[0][0].date).toBe('2026-12-28');
  });
});

describe('formatWeekRange', () => {
  it('names a week inside one month', () => {
    expect(formatWeekRange('2026-10-12')).toBe('12 al 18 de octubre');
  });

  it('names both months when the week crosses them', () => {
    expect(formatWeekRange('2026-09-28')).toBe(
      '28 de septiembre al 4 de octubre',
    );
  });

  it('names both years when the week crosses the new year', () => {
    expect(formatWeekRange('2026-12-28')).toBe(
      '28 de diciembre de 2026 al 3 de enero de 2027',
    );
  });
});

describe('monthsBetween', () => {
  it('gives the months a range touches, both ends included', () => {
    expect(monthsBetween('2026-10-05', '2026-10-20')).toEqual(['2026-10']);
    expect(monthsBetween('2026-09-28', '2026-11-02')).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('crosses the end of the year', () => {
    expect(monthsBetween('2026-12-28', '2027-01-03')).toEqual([
      '2026-12',
      '2027-01',
    ]);
  });
});

describe('monthDates', () => {
  it('gives every day of the month', () => {
    const october = monthDates('2026-10');
    expect(october).toHaveLength(31);
    expect(october[0]).toBe('2026-10-01');
    expect(october.at(-1)).toBe('2026-10-31');
  });

  it('knows the length of a short and of a leap February', () => {
    expect(monthDates('2026-02')).toHaveLength(28);
    expect(monthDates('2028-02')).toHaveLength(29);
  });
});

describe('weekdayIndex', () => {
  it('counts from Monday', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0);
    expect(weekdayIndex('2026-10-22')).toBe(3);
    expect(weekdayIndex('2026-10-25')).toBe(6);
  });
});
