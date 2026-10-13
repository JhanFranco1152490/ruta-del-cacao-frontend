import { describe, expect, it } from 'vitest';

import { nextGridDate, nextWeekDate } from './grid-navigation';

describe('nextGridDate', () => {
  const next = (key: string, date: string, month = '2026-10') =>
    nextGridDate(key, date, month);

  it('moves a day with the left and right arrows', () => {
    expect(next('ArrowRight', '2026-10-22')).toEqual({
      date: '2026-10-23',
      crosses: false,
    });
    expect(next('ArrowLeft', '2026-10-22')).toEqual({
      date: '2026-10-21',
      crosses: false,
    });
  });

  it('moves a week with the up and down arrows', () => {
    expect(next('ArrowDown', '2026-10-22')).toEqual({
      date: '2026-10-29',
      crosses: false,
    });
    expect(next('ArrowUp', '2026-10-22')).toEqual({
      date: '2026-10-15',
      crosses: false,
    });
  });

  it('goes to the Monday and to the Sunday of the week with Home and End', () => {
    expect(next('Home', '2026-10-22')?.date).toBe('2026-10-19');
    expect(next('End', '2026-10-22')?.date).toBe('2026-10-25');
  });

  it('asks to go to the next month when an arrow leaves the end of this one', () => {
    expect(next('ArrowRight', '2026-10-31')).toEqual({
      date: '2026-11-01',
      crosses: true,
    });
    // Un jueves 29 + 7 días cae en el jueves 5 de noviembre.
    expect(next('ArrowDown', '2026-10-29')).toEqual({
      date: '2026-11-05',
      crosses: true,
    });
  });

  it('asks to go to the previous month when an arrow leaves the start of this one', () => {
    expect(next('ArrowLeft', '2026-10-01')).toEqual({
      date: '2026-09-30',
      crosses: true,
    });
    expect(next('ArrowUp', '2026-10-02')).toEqual({
      date: '2026-09-25',
      crosses: true,
    });
  });

  it('crosses the end of the year', () => {
    expect(next('ArrowRight', '2026-12-31', '2026-12')).toEqual({
      date: '2027-01-01',
      crosses: true,
    });
  });

  it('keeps Home and End inside the month, they never change it', () => {
    expect(next('Home', '2026-10-01')).toEqual({
      date: '2026-10-01',
      crosses: false,
    });
    expect(next('End', '2026-10-31')).toEqual({
      date: '2026-10-31',
      crosses: false,
    });
  });

  it('does not take any other key', () => {
    expect(next('Enter', '2026-10-22')).toBeNull();
    expect(next('a', '2026-10-22')).toBeNull();
    expect(next('Tab', '2026-10-22')).toBeNull();
  });
});

describe('nextWeekDate', () => {
  const next = (key: string, date: string, week = '2026-10-19') =>
    nextWeekDate(key, date, week);

  it('moves a day with the left and right arrows', () => {
    expect(next('ArrowRight', '2026-10-21')).toEqual({
      date: '2026-10-22',
      crosses: false,
    });
    expect(next('ArrowLeft', '2026-10-21')).toEqual({
      date: '2026-10-20',
      crosses: false,
    });
  });

  it('asks to go to the next week after the Sunday and to the previous before the Monday', () => {
    expect(next('ArrowRight', '2026-10-25')).toEqual({
      date: '2026-10-26',
      crosses: true,
    });
    expect(next('ArrowLeft', '2026-10-19')).toEqual({
      date: '2026-10-18',
      crosses: true,
    });
  });

  it('goes to the Monday and to the Sunday with Home and End', () => {
    expect(next('Home', '2026-10-22')).toEqual({
      date: '2026-10-19',
      crosses: false,
    });
    expect(next('End', '2026-10-22')).toEqual({
      date: '2026-10-25',
      crosses: false,
    });
  });

  it('does not take the up and down arrows or other keys', () => {
    expect(next('ArrowUp', '2026-10-22')).toBeNull();
    expect(next('ArrowDown', '2026-10-22')).toBeNull();
    expect(next('Enter', '2026-10-22')).toBeNull();
  });
});
