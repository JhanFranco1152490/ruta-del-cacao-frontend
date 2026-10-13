import { describe, expect, it } from 'vitest';

import { nextGridDate } from './grid-navigation';

describe('nextGridDate', () => {
  const next = (key: string, date: string, month = '2026-10') =>
    nextGridDate(key, date, month);

  it('moves a day with the left and right arrows', () => {
    expect(next('ArrowRight', '2026-10-22')).toBe('2026-10-23');
    expect(next('ArrowLeft', '2026-10-22')).toBe('2026-10-21');
  });

  it('moves a week with the up and down arrows', () => {
    expect(next('ArrowDown', '2026-10-22')).toBe('2026-10-29');
    expect(next('ArrowUp', '2026-10-22')).toBe('2026-10-15');
  });

  it('goes to the Monday and to the Sunday of the week with Home and End', () => {
    expect(next('Home', '2026-10-22')).toBe('2026-10-19');
    expect(next('End', '2026-10-22')).toBe('2026-10-25');
  });

  it('stays inside the month at both ends', () => {
    expect(next('ArrowRight', '2026-10-31')).toBe('2026-10-31');
    expect(next('ArrowDown', '2026-10-30')).toBe('2026-10-31');
    expect(next('ArrowLeft', '2026-10-01')).toBe('2026-10-01');
    expect(next('ArrowUp', '2026-10-02')).toBe('2026-10-01');
    expect(next('Home', '2026-10-01')).toBe('2026-10-01');
    expect(next('End', '2026-10-31')).toBe('2026-10-31');
  });

  it('does not take any other key', () => {
    expect(next('Enter', '2026-10-22')).toBeNull();
    expect(next('a', '2026-10-22')).toBeNull();
    expect(next('Tab', '2026-10-22')).toBeNull();
  });
});
