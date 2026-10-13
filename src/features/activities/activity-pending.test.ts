import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from './activity-days';
import {
  DEFAULT_PENDING_DAYS,
  groupPendingActivities,
  isPendingDays,
  PENDING_DAY_OPTIONS,
  PENDING_FETCH_DAYS,
} from './activity-pending';

const TODAY = '2026-10-22';

const item = (
  id: string,
  scheduled_date: string,
  overrides: Parameters<typeof buildAgriculturalActivity>[0] = {},
  completion?: 'pending' | 'error',
) =>
  toActivityOfDay(
    buildAgriculturalActivity({ id, scheduled_date, ...overrides }),
    TODAY,
    completion ? new Map([[id, completion]]) : undefined,
  );

const idsOf = (
  groups: ReturnType<typeof groupPendingActivities>,
  key: string,
) =>
  groups
    .find((group) => group.key === key)
    ?.items.map(({ activity }) => activity.id);

describe('groupPendingActivities', () => {
  it('splits what needs attention by urgency, always in the same order', () => {
    const groups = groupPendingActivities(
      [
        item('up', '2026-10-30'),
        item('today', TODAY),
        item('late', '2026-10-21'),
        item('old', '2026-03-02'),
      ],
      TODAY,
    );

    expect(groups.map(({ key }) => key)).toEqual([
      'overdue',
      'delayed',
      'today',
      'upcoming',
    ]);
    expect(idsOf(groups, 'overdue')).toEqual(['old']);
    expect(idsOf(groups, 'delayed')).toEqual(['late']);
    expect(idsOf(groups, 'today')).toEqual(['today']);
    expect(idsOf(groups, 'upcoming')).toEqual(['up']);
  });

  it('puts the oldest overdue first', () => {
    const groups = groupPendingActivities(
      [
        item('b', '2026-09-01'),
        item('a', '2026-03-02'),
        item('c', '2026-10-10'),
      ],
      TODAY,
    );

    expect(idsOf(groups, 'overdue')).toEqual(['a', 'b', 'c']);
  });

  it('puts the next ones in date order', () => {
    const groups = groupPendingActivities(
      [item('b', '2026-10-30'), item('a', '2026-10-23')],
      TODAY,
    );

    expect(idsOf(groups, 'upcoming')).toEqual(['a', 'b']);
  });

  it('includes the fourteenth day after today and leaves out the fifteenth', () => {
    const groups = groupPendingActivities(
      [item('in', '2026-11-05'), item('out', '2026-11-06')],
      TODAY,
    );

    expect(idsOf(groups, 'upcoming')).toEqual(['in']);
  });

  it('leaves out the done ones and those whose completion waits to be sent', () => {
    const groups = groupPendingActivities(
      [
        item('done', '2026-10-05', {
          status: 'done',
          state: 'done',
          done_date: '2026-10-05',
        }),
        item('waiting', '2026-10-10', {}, 'pending'),
        item('rejected', '2026-10-10', {}, 'error'),
      ],
      TODAY,
    );

    expect(idsOf(groups, 'overdue')).toEqual(['rejected']);
  });

  it('counts the days the person asks for', () => {
    const groups = groupPendingActivities(
      [
        item('a', '2026-10-29'),
        item('b', '2026-11-20'),
        item('c', '2027-01-20'),
      ],
      TODAY,
      30,
    );

    expect(idsOf(groups, 'upcoming')).toEqual(['a', 'b']);
    expect(groups.find(({ key }) => key === 'upcoming')?.label).toBe(
      'Próximos 30 días',
    );
  });

  it('shows the next 14 days when the person did not choose', () => {
    const [, , , upcoming] = groupPendingActivities([], TODAY);

    expect(upcoming.label).toBe('Próximos 14 días');
    expect(DEFAULT_PENDING_DAYS).toBe(14);
  });

  it('gives every group even when it is empty, so the screen decides what to show', () => {
    const groups = groupPendingActivities([], TODAY);

    expect(groups.map(({ items }) => items.length)).toEqual([0, 0, 0, 0]);
  });
});

describe('the days that can be asked for', () => {
  it('are a short list, and the largest one is what is read from the server', () => {
    expect(PENDING_DAY_OPTIONS).toEqual([7, 14, 30, 60, 90]);
    expect(PENDING_FETCH_DAYS).toBe(90);
  });

  it('knows which numbers are valid', () => {
    expect(isPendingDays(30)).toBe(true);
    expect(isPendingDays(15)).toBe(false);
  });
});
