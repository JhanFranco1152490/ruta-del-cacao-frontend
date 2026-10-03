import { describe, expect, it } from 'vitest';

import { labelPointOf } from './label-point';
import type { MultiPolygonCoordinates } from './point-in-polygon';

const square = (x: number, y: number, size: number) => [
  [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ],
];

describe('labelPointOf', () => {
  it('puts the label at the center of a square', () => {
    expect(labelPointOf([square(0, 0, 10)])).toEqual({
      latitude: 5,
      longitude: 5,
    });
  });

  it('uses the largest polygon of a multipolygon', () => {
    const shapes: MultiPolygonCoordinates = [
      square(0, 0, 2),
      square(10, 10, 6),
    ];

    expect(labelPointOf(shapes)).toEqual({ latitude: 13, longitude: 13 });
  });
});
