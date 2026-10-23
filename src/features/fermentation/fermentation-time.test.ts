import { describe, expect, it } from 'vitest';

import { durationText, hoursBetween, hoursText } from './fermentation-time';

describe('hoursBetween', () => {
  it('counts the hours between two moments', () => {
    expect(
      hoursBetween('2026-10-15T07:00:00-05:00', '2026-10-17T11:00:00-05:00'),
    ).toBe(52);
  });

  // Como el servidor: un decimal, con la mitad hacia arriba. 2 h 3 min son 2,1 h.
  it('keeps one decimal, rounding the half up', () => {
    expect(
      hoursBetween('2026-10-15T07:00:00-05:00', '2026-10-15T09:03:00-05:00'),
    ).toBe(2.1);
    expect(
      hoursBetween('2026-10-15T07:00:00-05:00', '2026-10-15T07:02:59-05:00'),
    ).toBe(0);
  });
});

describe('hoursText', () => {
  it('writes the hours with the decimal comma and without a trailing zero', () => {
    expect(hoursText('52.0')).toBe('52 h');
    expect(hoursText(48.5)).toBe('48,5 h');
  });
});

describe('durationText', () => {
  it('says the days and the hours left over', () => {
    expect(durationText('122.0')).toBe('5 días y 2 h');
    expect(durationText(25)).toBe('1 día y 1 h');
  });

  it('leaves out the hours when the days are whole', () => {
    expect(durationText(48)).toBe('2 días');
    expect(durationText(24)).toBe('1 día');
  });

  it('says only the hours under a day', () => {
    expect(durationText(20)).toBe('20 h');
  });

  it('rounds to the nearest hour', () => {
    expect(durationText(121.6)).toBe('5 días y 2 h');
  });
});
