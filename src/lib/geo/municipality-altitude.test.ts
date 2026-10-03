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
    // Silos: de 2060 a 4256 m.
    expect(altitudeRangeFor('54743')).toEqual({
      minimum: 2060 - ALTITUDE_MARGIN_M,
      maximum: 4256 + ALTITUDE_MARGIN_M,
    });
  });

  it('never goes below sea level', () => {
    // Puerto Santander va de 43 a 72 m: con el margen el mínimo sería -57, y se queda en 0.
    expect(altitudeRangeFor('54553')).toEqual({
      minimum: 0,
      maximum: 72 + ALTITUDE_MARGIN_M,
    });
    expect(altitudeRangeFor('54001')!.minimum).toBe(0);
  });

  it('puts the lowlands and the mountains where they belong', () => {
    expect(altitudeRangeFor('54810')!.maximum).toBeLessThan(2000); // Tibú
    expect(altitudeRangeFor('54743')!.minimum).toBeGreaterThan(1900); // Silos
  });

  it('has no range for a code that is not a municipality of the department', () => {
    expect(altitudeRangeFor('99999')).toBeNull();
  });
});
