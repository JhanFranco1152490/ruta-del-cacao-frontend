import { describe, expect, it } from 'vitest';

import { dayNumberOf } from './drying-day';

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
