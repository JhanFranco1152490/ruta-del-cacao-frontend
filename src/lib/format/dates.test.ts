import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatLongDate, todayInBogota } from './dates';

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
