import { describe, expect, it } from 'vitest';

import { harvestAgeText } from './lot-age';

describe('harvestAgeText', () => {
  it('says today, yesterday and the days since', () => {
    expect(harvestAgeText(0)).toBe('hoy');
    expect(harvestAgeText(1)).toBe('ayer');
    expect(harvestAgeText(14)).toBe('hace 14 días');
  });

  it('does not say a negative age for a harvest dated in the future', () => {
    expect(harvestAgeText(-1)).toBe('hoy');
  });
});
