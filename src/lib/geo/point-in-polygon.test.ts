import { describe, expect, it } from 'vitest';

import {
  type MultiPolygonCoordinates,
  multiPolygonContains,
} from './point-in-polygon';

// Cuadrado de 10x10 con un hueco de 2x2 en el centro, más una isla aparte. Posiciones en el
// orden de GeoJSON: [longitud, latitud].
const square = [
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ],
  [
    [4, 4],
    [6, 4],
    [6, 6],
    [4, 6],
    [4, 4],
  ],
];
const island = [
  [
    [20, 20],
    [22, 20],
    [22, 22],
    [20, 22],
    [20, 20],
  ],
];
const shapes: MultiPolygonCoordinates = [square, island];

const at = (longitude: number, latitude: number) => ({ latitude, longitude });

describe('multiPolygonContains', () => {
  it('finds a point inside the outer ring', () => {
    expect(multiPolygonContains(shapes, at(2, 2))).toBe(true);
  });

  it('excludes a point inside a hole', () => {
    expect(multiPolygonContains(shapes, at(5, 5))).toBe(false);
  });

  it('finds a point in the second polygon', () => {
    expect(multiPolygonContains(shapes, at(21, 21))).toBe(true);
  });

  it('excludes a point outside every polygon', () => {
    expect(multiPolygonContains(shapes, at(15, 15))).toBe(false);
  });

  it('reads positions as longitude first', () => {
    const tall: MultiPolygonCoordinates = [
      [
        [
          [0, 0],
          [1, 0],
          [1, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    ];
    expect(multiPolygonContains(tall, at(0.5, 8))).toBe(true);
    expect(multiPolygonContains(tall, at(8, 0.5))).toBe(false);
  });
});
