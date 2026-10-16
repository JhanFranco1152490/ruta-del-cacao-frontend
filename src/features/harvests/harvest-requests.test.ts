import { describe, expect, it } from 'vitest';

import { buildHarvest } from '@/test/factories';

import {
  harvestToFormValues,
  toHarvestRequest,
  toHarvestUpdate,
} from './harvest-requests';

describe('toHarvestRequest', () => {
  it('builds the body of the request with the id of the device', () => {
    expect(
      toHarvestRequest(
        {
          plot_id: 'p1',
          harvest_date: '2026-10-14',
          green_weight_kg: '120.5',
          variety_id: 'v1',
          collector_id: 'c1',
        },
        'h1',
      ),
    ).toEqual({
      id: 'h1',
      plot_id: 'p1',
      harvest_date: '2026-10-14',
      green_weight_kg: '120.5',
      variety_id: 'v1',
      collector_id: 'c1',
    });
  });
});

describe('correcting a harvest of the server', () => {
  const harvest = buildHarvest({ green_weight_kg: '120.50', version: 3 });

  it('starts from what the harvest has', () => {
    expect(harvestToFormValues(harvest)).toEqual({
      plot_id: 'pl1',
      harvest_date: '2026-10-14',
      green_weight_kg: '120.50',
      variety_id: 'v1',
      collector_id: 'u1',
    });
  });

  it('sends only what changed, with the version that was read', () => {
    expect(
      toHarvestUpdate(
        { ...harvestToFormValues(harvest), green_weight_kg: '118' },
        harvest,
      ),
    ).toEqual({ expected_version: 3, green_weight_kg: '118' });
  });

  it('does not count the same weight written differently as a change', () => {
    expect(
      toHarvestUpdate(
        { ...harvestToFormValues(harvest), green_weight_kg: '120.5' },
        harvest,
      ),
    ).toEqual({ expected_version: 3 });
  });
});
