import { describe, expect, it } from 'vitest';

import { offlineWindowMonths } from './activity-cache';

describe('offlineWindowMonths', () => {
  it('goes from the month before the current one to two months after it', () => {
    expect(offlineWindowMonths('2026-10-09')).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
  });

  it('crosses the end of the year in both directions', () => {
    expect(offlineWindowMonths('2026-12-31')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(offlineWindowMonths('2027-01-01')).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
    ]);
  });
});
