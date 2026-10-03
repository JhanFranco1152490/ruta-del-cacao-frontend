import { describe, expect, it } from 'vitest';

import { buildVertex } from '@/test/factories';

import {
  type DraftVertex,
  fromApiBoundary,
  toApiBoundary,
  toPoints,
} from './plot-vertices';

const gps: DraftVertex = {
  latitude: 7.8,
  longitude: -72.5,
  source: 'gps',
  accuracyM: 4,
  capturedAt: '2026-10-01T14:02:10Z',
};

describe('plot vertices', () => {
  it('writes coordinates as text with seven decimals and the accuracy with one', () => {
    expect(toApiBoundary([gps])).toEqual([
      {
        latitude: '7.8000000',
        longitude: '-72.5000000',
        accuracy_m: '4.0',
        captured_at: '2026-10-01T14:02:10Z',
        source: 'gps',
      },
    ]);
  });

  it('never sends an accuracy for a vertex that did not come from the GPS', () => {
    const [vertex] = toApiBoundary([{ ...gps, source: 'map' }]);

    expect(vertex.accuracy_m).toBeNull();
  });

  it('reads a boundary from the API back into numbers and keeps where each vertex came from', () => {
    const [vertex] = fromApiBoundary([
      buildVertex('-72.5000000', '7.8000000', {
        source: 'gps',
        accuracy_m: '4.0',
      }),
    ]);

    expect(vertex).toMatchObject({
      latitude: 7.8,
      longitude: -72.5,
      source: 'gps',
      accuracyM: 4,
    });
  });

  it('reads no boundary as no vertices', () => {
    expect(fromApiBoundary(null)).toEqual([]);
  });

  it('gives the plain points used by the geometry', () => {
    expect(toPoints([gps])).toEqual([{ latitude: 7.8, longitude: -72.5 }]);
  });
});
