import { afterEach, describe, expect, it, vi } from 'vitest';

import { todayInBogota } from '@/lib/format/dates';

import { activityState, OVERDUE_AFTER_DAYS } from './activity-state';

afterEach(() => vi.useRealTimers());

const scheduled = (scheduled_date: string) =>
  ({ status: 'scheduled', scheduled_date }) as const;

describe('OVERDUE_AFTER_DAYS', () => {
  // El servidor calcula el estado con la misma tolerancia: si cambia aquí, cambia allá.
  it('is three days', () => {
    expect(OVERDUE_AFTER_DAYS).toBe(3);
  });
});

describe('activityState', () => {
  it('is scheduled on its day and before it', () => {
    expect(activityState(scheduled('2026-10-20'), '2026-10-20')).toEqual({
      state: 'scheduled',
      daysLate: 0,
    });
    expect(activityState(scheduled('2026-10-20'), '2026-10-01')).toEqual({
      state: 'scheduled',
      daysLate: 0,
    });
  });

  it('is delayed one and two days after its date', () => {
    expect(activityState(scheduled('2026-10-20'), '2026-10-21')).toEqual({
      state: 'delayed',
      daysLate: 1,
    });
    expect(activityState(scheduled('2026-10-20'), '2026-10-22')).toEqual({
      state: 'delayed',
      daysLate: 2,
    });
  });

  it('is overdue from the third day on', () => {
    expect(activityState(scheduled('2026-10-20'), '2026-10-23')).toEqual({
      state: 'overdue',
      daysLate: 3,
    });
    expect(activityState(scheduled('2026-10-20'), '2026-11-04')).toEqual({
      state: 'overdue',
      daysLate: 15,
    });
  });

  it('counts calendar days across a month and a year', () => {
    expect(activityState(scheduled('2026-12-31'), '2027-01-01')).toEqual({
      state: 'delayed',
      daysLate: 1,
    });
  });

  it('is done without delay even when its date is old', () => {
    expect(
      activityState(
        { status: 'done', scheduled_date: '2026-01-05' },
        '2026-10-20',
      ),
    ).toEqual({ state: 'done', daysLate: 0 });
  });

  it('turns delayed at midnight in Bogotá, not in UTC', () => {
    vi.useFakeTimers();
    // 04:30 UTC del 21 son las 23:30 del 20 en Bogotá: todavía es su día.
    vi.setSystemTime(new Date('2026-10-21T04:30:00Z'));
    expect(activityState(scheduled('2026-10-20'), todayInBogota()).state).toBe(
      'scheduled',
    );

    // 05:00 UTC del 21 es la medianoche de Bogotá.
    vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
    expect(activityState(scheduled('2026-10-20'), todayInBogota())).toEqual({
      state: 'delayed',
      daysLate: 1,
    });
  });
});
