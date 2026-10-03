import { describe, expect, it } from 'vitest';

import { polygonAreaHectares } from './area';
import { findOverlaps } from './overlap';
import { rect } from './test-shapes';

describe('findOverlaps', () => {
  it('does not count plots that share a side', () => {
    expect(
      findOverlaps(rect(0, 0, 1, 1), [{ id: 'P2', points: rect(1, 0, 2, 1) }]),
    ).toEqual([]);
  });

  it('treats an overlap under one square metre as a shared side', () => {
    // Una franja de 0,0000001° (1 cm) a lo largo de un lado de 11 m: 0,1 m².
    const own = [
      { latitude: 7.8, longitude: -72.5 },
      { latitude: 7.8, longitude: -72.4999 },
      { latitude: 7.8001, longitude: -72.4999 },
      { latitude: 7.8001, longitude: -72.5 },
    ];
    const neighbour = [
      { latitude: 7.8, longitude: -72.4999001 },
      { latitude: 7.8, longitude: -72.4998 },
      { latitude: 7.8001, longitude: -72.4998 },
      { latitude: 7.8001, longitude: -72.4999001 },
    ];

    expect(findOverlaps(own, [{ id: 'P2', points: neighbour }])).toEqual([]);
  });

  it('reports each neighbour overlapped, in order, with the invaded area', () => {
    const overlaps = findOverlaps(rect(0, 0, 2, 2), [
      { id: 'P2', points: rect(1, 0, 3, 2) },
      { id: 'P3', points: rect(0, 3, 1, 4) },
      { id: 'P4', points: rect(-1, -1, 1, 1) },
    ]);

    expect(overlaps.map(({ id }) => id)).toEqual(['P2', 'P4']);
    // P2 cubre la mitad de la parcela; P4, un cuarto.
    expect(overlaps[0].areaHectares).toBe(
      polygonAreaHectares(rect(1, 0, 2, 2)),
    );
    expect(overlaps[1].areaHectares).toBe(
      polygonAreaHectares(rect(0, 0, 1, 1)),
    );
  });
});
