import { describe, expect, it } from 'vitest';

import { clusterScreenPoints } from './cluster-points';

const at = (item: string, x: number, y: number) => ({ item, x, y });

describe('clusterScreenPoints', () => {
  it('returns no clusters without points', () => {
    expect(clusterScreenPoints([], 40)).toEqual([]);
  });

  it('keeps a lone point on its own', () => {
    expect(clusterScreenPoints([at('a', 10, 10)], 40)).toEqual([
      { items: ['a'], x: 10, y: 10 },
    ]);
  });

  it('groups points that overlap on screen around their average', () => {
    expect(clusterScreenPoints([at('a', 0, 0), at('b', 30, 0)], 40)).toEqual([
      { items: ['a', 'b'], x: 15, y: 0 },
    ]);
  });

  it('keeps distant points apart', () => {
    expect(
      clusterScreenPoints([at('a', 0, 0), at('b', 100, 0)], 40),
    ).toHaveLength(2);
  });

  it('counts the radius itself as overlapping', () => {
    expect(
      clusterScreenPoints([at('a', 0, 0), at('b', 40, 0)], 40),
    ).toHaveLength(1);
  });
});
