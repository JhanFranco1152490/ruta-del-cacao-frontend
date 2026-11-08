import { describe, expect, it } from 'vitest';

import { buildFermentation } from '@/test/factories';

import { fermentationSummary } from './fermentation-summary';

describe('fermentationSummary', () => {
  it('says the box, that it is under way and the turns', () => {
    expect(fermentationSummary(buildFermentation())).toBe(
      'C-01 · En curso · 0 volteos',
    );
  });

  it('says how long a finished one lasted instead of that it is under way', () => {
    const fermentation = buildFermentation({
      result: {
        ended_at: '2026-10-17T05:00:00-05:00',
        duration_hours: '118.0',
        turn_count: 3,
        notes: '',
      },
    });

    expect(fermentationSummary(fermentation)).toBe(
      'C-01 · 4 días y 22 h · 0 volteos',
    );
  });
});
