import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from './activity-days';
import {
  countByState,
  countByType,
  summarizeActivities,
} from './activity-summary';

const TODAY = '2026-10-22';

const item = (
  overrides: Parameters<typeof buildAgriculturalActivity>[0] = {},
  completion?: 'pending',
) =>
  toActivityOfDay(
    buildAgriculturalActivity(overrides),
    TODAY,
    completion ? new Map([[overrides.id ?? 'a1', completion]]) : undefined,
  );

const done = {
  status: 'done',
  state: 'done',
  done_date: '2026-10-05',
} as const;

describe('countByState', () => {
  it('counts each state with the state of today', () => {
    const counts = countByState([
      item({ id: 'a', scheduled_date: '2026-10-25' }),
      item({ id: 'b', scheduled_date: '2026-10-26' }),
      item({ id: 'c', scheduled_date: '2026-10-21' }),
      item({ id: 'd', scheduled_date: '2026-10-10' }),
      item({ id: 'e', scheduled_date: '2026-10-05', ...done }),
    ]);

    expect(counts).toEqual({ scheduled: 2, delayed: 1, overdue: 1, done: 1 });
  });

  it('counts a completion that waits to be sent as done', () => {
    const counts = countByState([
      item({ id: 'a', scheduled_date: '2026-10-25' }, 'pending'),
    ]);

    expect(counts).toEqual({ scheduled: 0, delayed: 0, overdue: 0, done: 1 });
  });

  it('is all zeros without activities', () => {
    expect(countByState([])).toEqual({
      scheduled: 0,
      delayed: 0,
      overdue: 0,
      done: 0,
    });
  });
});

describe('countByType', () => {
  it('counts each type, the most frequent first and ties in the order of the form', () => {
    const rows = countByType([
      item({ id: 'a', activity_type: 'irrigation' }),
      item({ id: 'b', activity_type: 'pruning' }),
      item({ id: 'c', activity_type: 'irrigation' }),
      item({ id: 'd', activity_type: 'fertilization' }),
    ]);

    expect(rows).toEqual([
      { type: 'irrigation', label: 'Riego', count: 2 },
      { type: 'pruning', label: 'Poda', count: 1 },
      { type: 'fertilization', label: 'Fertilización', count: 1 },
    ]);
  });

  it('keeps a type this version does not know, as it comes', () => {
    const rows = countByType([
      item({ activity_type: 'soil_analysis' as never }),
    ]);

    expect(rows).toEqual([
      { type: 'soil_analysis', label: 'soil_analysis', count: 1 },
    ]);
  });

  it('is empty without activities', () => {
    expect(countByType([])).toEqual([]);
  });
});

describe('summarizeActivities', () => {
  it('gives the total with both counts', () => {
    const summary = summarizeActivities([
      item({ id: 'a' }),
      item({ id: 'b', ...done }),
    ]);

    expect(summary.total).toBe(2);
    expect(summary.byState.done).toBe(1);
    expect(summary.byType).toHaveLength(1);
  });
});
