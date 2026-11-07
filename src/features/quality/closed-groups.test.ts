import { describe, expect, it } from 'vitest';

import {
  buildLotQuality,
  buildQualityClassification,
  buildQualityDiscard,
} from '@/test/factories';

import { closedAt, groupByClosingMonth } from './closed-groups';

const classified = (id: string, at: string) =>
  buildLotQuality({
    lot: { ...buildLotQuality().lot, id, status: 'classified' },
    classification: buildQualityClassification({ classified_at: at }),
  });
const discarded = (id: string, at: string) =>
  buildLotQuality({
    lot: { ...buildLotQuality().lot, id, status: 'discarded' },
    discard: buildQualityDiscard({ discarded_at: at }),
  });

describe('closed groups', () => {
  it('takes the closing moment from the classification or the discard', () => {
    expect(closedAt(classified('a', '2026-11-02T10:00:00-05:00'))).toBe(
      '2026-11-02T10:00:00-05:00',
    );
    expect(closedAt(discarded('b', '2026-10-30T10:00:00-05:00'))).toBe(
      '2026-10-30T10:00:00-05:00',
    );
    expect(closedAt(buildLotQuality())).toBeNull();
  });

  it('splits a newest-first page into closing months', () => {
    const groups = groupByClosingMonth([
      classified('a', '2026-11-03T10:00:00-05:00'),
      discarded('b', '2026-11-01T09:00:00-05:00'),
      classified('c', '2026-10-30T10:00:00-05:00'),
    ]);

    expect(
      groups.map(({ month, lots }) => [month, lots.map((l) => l.lot.id)]),
    ).toEqual([
      ['2026-11', ['a', 'b']],
      ['2026-10', ['c']],
    ]);
  });

  it('puts a lot closed at 11 pm Bogotá in that day, not the next in UTC', () => {
    const [group] = groupByClosingMonth([
      discarded('a', '2026-10-31T23:30:00-05:00'),
    ]);

    expect(group.month).toBe('2026-10');
  });

  it('gives no groups for no lots', () => {
    expect(groupByClosingMonth([])).toEqual([]);
  });
});
