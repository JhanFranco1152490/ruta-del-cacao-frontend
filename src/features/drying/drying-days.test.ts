import { describe, expect, it } from 'vitest';

import {
  availableHours,
  dayNumberOf,
  dryingDays,
  missingTodayLog,
  totalDays,
} from './drying-days';

// Un secado iniciado el 22 oct. a las 14:00 (hora de Bogotá).
const started = '2026-10-22T14:00:00-05:00';

describe('dayNumberOf', () => {
  it('counts by date: day 1 is the day it started, even in the afternoon', () => {
    expect(dayNumberOf(started, '2026-10-22T18:00:00-05:00')).toBe(1);
    expect(dayNumberOf(started, '2026-10-23T00:10:00-05:00')).toBe(2);
    expect(dayNumberOf(started, '2026-10-24T16:00:00-05:00')).toBe(3);
  });

  it('uses the Bogotá date, not the UTC one', () => {
    // 23:30 en Bogotá ya es el día siguiente en UTC.
    expect(dayNumberOf(started, '2026-10-22T23:30:00-05:00')).toBe(1);
  });
});

describe('availableHours', () => {
  const now = new Date('2026-10-25T09:00:00-05:00');

  it('counts the first day from the start time', () => {
    expect(availableHours('2026-10-22', started, now)).toBe(10);
  });

  it('gives a full day to the days in between', () => {
    expect(availableHours('2026-10-23', started, now)).toBe(24);
  });

  it('counts today only up to now', () => {
    expect(availableHours('2026-10-25', started, now)).toBe(9);
  });

  it('has no hours before the start or after now', () => {
    expect(availableHours('2026-10-21', started, now)).toBe(0);
    expect(availableHours('2026-10-26', started, now)).toBe(0);
  });
});

describe('totalDays', () => {
  const now = new Date('2026-10-24T10:00:00-05:00');

  it('goes up to today', () => {
    expect(totalDays({ startedAt: started, now, logDays: [1, 2] })).toBe(3);
  });

  it('goes up to the last log when it is later than today', () => {
    expect(totalDays({ startedAt: started, now, logDays: [1, 5] })).toBe(5);
  });

  it('is the length of the result once finished', () => {
    expect(
      totalDays({ startedAt: started, now, logDays: [1, 2], resultDays: 5 }),
    ).toBe(5);
  });
});

describe('dryingDays', () => {
  it('lists every day with its log or without it', () => {
    const days = dryingDays(started, 3, [
      { day_number: 1, id: 'a' },
      { day_number: 3, id: 'c' },
    ]);

    expect(
      days.map(({ day, date, log }) => [day, date, log?.id ?? null]),
    ).toEqual([
      [1, '2026-10-22', 'a'],
      [2, '2026-10-23', null],
      [3, '2026-10-24', 'c'],
    ]);
  });
});

describe('missingTodayLog', () => {
  const now = new Date('2026-10-24T10:00:00-05:00');

  it('is missing when no known date is today', () => {
    expect(missingTodayLog(['2026-10-22', '2026-10-23'], now)).toBe(true);
    expect(missingTodayLog([], now)).toBe(true);
  });

  it('is not missing when a log (even one in the queue) has today', () => {
    expect(missingTodayLog(['2026-10-22', '2026-10-24'], now)).toBe(false);
  });
});
