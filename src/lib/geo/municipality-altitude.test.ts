import { describe, expect, it } from 'vitest';

import municipalities from './norte-de-santander-municipalities.json';
import { ALTITUDE_MARGIN_M, altitudeRangeFor } from './municipality-altitude';

describe('altitudeRangeFor', () => {
  it('knows every municipality of the department', () => {
    for (const { properties } of municipalities.features) {
      expect(altitudeRangeFor(properties.code), properties.code).not.toBeNull();
    }
  });

  it('widens the range of the terrain by the margin', () => {
    // Puerto Santander: de 43 a 72 m.
    expect(altitudeRangeFor('54553')).toEqual({
      minimum: 43 - ALTITUDE_MARGIN_M,
      maximum: 72 + ALTITUDE_MARGIN_M,
    });
  });

  it('puts the lowlands and the mountains where they belong', () => {
    expect(altitudeRangeFor('54810')!.maximum).toBeLessThan(2000); // Tibú
    expect(altitudeRangeFor('54743')!.minimum).toBeGreaterThan(1900); // Silos
  });

  it('has no range for a code that is not a municipality of the department', () => {
    expect(altitudeRangeFor('99999')).toBeNull();
  });
});
