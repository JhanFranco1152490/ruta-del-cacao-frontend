import { describe, expect, it } from 'vitest';

import { buildDrying } from '@/test/factories';

import { dryingSummary } from './drying-summary';

describe('dryingSummary', () => {
  it('says the dryer, that it is under way and the logs', () => {
    expect(dryingSummary(buildDrying())).toBe('M-01 · En curso · 0 bitácoras');
  });

  it('says the days, the dry weight and the yield of a finished one', () => {
    const drying = buildDrying({
      result: {
        ended_at: '2026-10-27T18:00:00-05:00',
        duration_hours: '124.0',
        days: 5,
        total_sun_hours: '34.0',
        final_moisture_pct: '7.0',
        dry_weight_kg: '114.0',
        yield_pct: '38.0',
      },
    });

    expect(dryingSummary(drying)).toBe(
      'M-01 · 5 días · 114,0 kg secos · 38,0 % de rendimiento',
    );
  });
});
