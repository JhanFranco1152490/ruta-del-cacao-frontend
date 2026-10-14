import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import altitudes from './municipality-altitude.json';
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

// La misma tabla y el mismo margen viven copiados en el servidor, que los valida al guardar. Los dos
// repos fijan esta misma huella: si cambia la tabla o el margen, esta prueba falla y obliga a
// actualizar la huella en ambos lados a la vez.
const SHARED_TABLE_FINGERPRINT =
  'b430c1a23646da285ea354451dc3139b3f95649f1836a4292ffcbb8d9e4778cc';

describe('the altitude table', () => {
  it('matches the copy the server validates with', () => {
    const ranges = altitudes as unknown as Record<string, [number, number]>;
    const lines = [
      `margin:${ALTITUDE_MARGIN_M}`,
      ...Object.keys(ranges)
        .sort()
        .map((code) => `${code}:${ranges[code][0]}-${ranges[code][1]}`),
    ];
    const fingerprint = createHash('sha256')
      .update(lines.join('\n'))
      .digest('hex');
    expect(fingerprint).toBe(SHARED_TABLE_FINGERPRINT);
  });
});
