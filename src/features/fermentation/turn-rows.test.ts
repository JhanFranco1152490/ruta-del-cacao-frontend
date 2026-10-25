import { describe, expect, it } from 'vitest';

import { buildFermentation, buildFermentationTurn } from '@/test/factories';

import type { QueuedTurn } from './turn-queue';
import { hasAnyTurn, turnRows } from './turn-rows';

const fermentation = buildFermentation({
  started_at: '2026-10-15T07:00:00-05:00',
  turns: [
    buildFermentationTurn({
      id: 't2',
      turned_at: '2026-10-18T08:00:00-05:00',
      hours_since_start: '73.0',
    }),
    buildFermentationTurn({
      id: 't1',
      turned_at: '2026-10-17T07:30:00-05:00',
      hours_since_start: '48.5',
    }),
  ],
});

const queued = (overrides: Partial<QueuedTurn> = {}): QueuedTurn => ({
  id: 'q1',
  lotId: 'l1',
  request: {
    id: 'q1',
    turned_at: '2026-10-17T19:00:00-05:00',
    temperature_c: '46.0',
    ph: '4.80',
    notes: '',
    captured_at: null,
  },
  label: '',
  status: 'pending',
  ...overrides,
});

describe('turnRows', () => {
  it('lists the turns from the first to the last, numbered by their time', () => {
    expect(
      turnRows(fermentation, []).map(({ id, number, hours }) => [
        id,
        number,
        hours,
      ]),
    ).toEqual([
      ['t1', 1, 48.5],
      ['t2', 2, 73],
    ]);
  });

  it('puts the turns still on the phone in their place, marked and with their hours', () => {
    const rows = turnRows(fermentation, [
      queued(),
      queued({ id: 'q2', lotId: 'l2' }),
    ]);

    expect(
      rows.map(({ id, number, pending }) => [id, number, pending]),
    ).toEqual([
      ['t1', 1, false],
      ['q1', 2, true],
      ['t2', 3, false],
    ]);
    expect(rows[1].hours).toBe(60);
    expect(rows[1].turn).toBeUndefined();
    expect(rows[0].turn?.id).toBe('t1');
  });
});

describe('hasAnyTurn', () => {
  it('counts the turns of the server and those on their way to it', () => {
    const empty = buildFermentation();

    expect(hasAnyTurn(empty, [])).toBe(false);
    expect(hasAnyTurn(empty, [queued()])).toBe(true);
    expect(hasAnyTurn(empty, [queued({ status: 'error' })])).toBe(false);
    expect(hasAnyTurn(fermentation, [])).toBe(true);
  });
});
