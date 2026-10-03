import { describe, expect, it } from 'vitest';

import { boundsContain, OPERATING_AREA_BOUNDS } from './operating-area';

describe('boundsContain', () => {
  it('accepts a point in Cúcuta', () => {
    expect(
      boundsContain(OPERATING_AREA_BOUNDS, {
        latitude: 7.8939,
        longitude: -72.5078,
      }),
    ).toBe(true);
  });

  it('accepts a point on the edge', () => {
    expect(
      boundsContain(OPERATING_AREA_BOUNDS, {
        latitude: 6.872,
        longitude: -72.047,
      }),
    ).toBe(true);
  });

  it('rejects a point in Bogotá', () => {
    expect(
      boundsContain(OPERATING_AREA_BOUNDS, {
        latitude: 4.711,
        longitude: -74.072,
      }),
    ).toBe(false);
  });

  it('rejects swapped coordinates', () => {
    expect(
      boundsContain(OPERATING_AREA_BOUNDS, {
        latitude: -72.5078,
        longitude: 7.8939,
      }),
    ).toBe(false);
  });
});
