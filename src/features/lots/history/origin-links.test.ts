import { describe, expect, it } from 'vitest';

import { buildLotHistory } from '@/test/lot-history-factories';

import { harvestGreenKg } from './origin-links';

describe('harvestGreenKg', () => {
  it('reads the kilos of the harvest stage', () => {
    expect(harvestGreenKg(buildLotHistory())).toBe('120.0');
  });

  it('has nothing to read without a harvest stage', () => {
    expect(harvestGreenKg(buildLotHistory({ stages: [] }))).toBeNull();
  });
});
