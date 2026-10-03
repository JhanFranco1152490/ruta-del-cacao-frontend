import { describe, expect, it } from 'vitest';

import type { GeoPoint } from '@/types/geo';

import {
  polygonAreaHectares,
  polygonAreaSquareMetres,
  squareMetresToHectares,
} from './area';

const ring = (pairs: [number, number][]): GeoPoint[] =>
  pairs.map(([longitude, latitude]) => ({ latitude, longitude }));

// Las áreas que da `@turf/area` y que el servidor fija en sus pruebas con los mismos anillos: si
// las dos fórmulas se separan, la persona vería al dibujar un área distinta de la que se valida.
const REFERENCE: [GeoPoint[], number][] = [
  [
    ring([
      [-72.5, 7.8],
      [-72.4990917, 7.8],
      [-72.4990917, 7.8009044],
      [-72.5, 7.8009044],
    ]),
    10062.912069,
  ],
  [
    ring([
      [-72.7321, 8.6429],
      [-72.73102, 8.64318],
      [-72.73095, 8.64462],
      [-72.73228, 8.64441],
    ]),
    21891.18877,
  ],
  [
    ring([
      [-72.5123456, 7.8234567],
      [-72.5101234, 7.8239876],
      [-72.5109876, 7.8251234],
      [-72.5115432, 7.824321],
      [-72.5126543, 7.8250123],
    ]),
    26545.08323,
  ],
];

describe('polygon area', () => {
  it.each(REFERENCE)(
    'matches the value the server fixes (%#)',
    (points, expected) => {
      expect(polygonAreaSquareMetres(points)).toBeCloseTo(expected, 5);
    },
  );

  it('does not depend on the direction of the ring', () => {
    const [points] = REFERENCE[1];

    expect(polygonAreaSquareMetres([...points].reverse())).toBeCloseTo(
      polygonAreaSquareMetres(points),
      6,
    );
  });

  it('is zero with fewer than three vertices', () => {
    expect(polygonAreaSquareMetres([])).toBe(0);
    expect(polygonAreaSquareMetres(REFERENCE[0][0].slice(0, 2))).toBe(0);
  });

  it('gives hectares with four decimals', () => {
    expect(polygonAreaHectares(REFERENCE[0][0])).toBe(1.0063);
    expect(squareMetresToHectares(24100)).toBe(2.41);
  });
});
