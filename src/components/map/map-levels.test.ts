import { describe, expect, it } from 'vitest';

import { levelOf } from './map-levels';

describe('levelOf', () => {
  it.each([
    [0, 30, 0],
    [1, 100, 1],
    [50, 100, 3],
    [30, 30, 5],
    [40, 30, 5],
    [5, 0, 0],
  ])('maps %i of %i farms to level %i', (count, max, level) => {
    expect(levelOf(count, max)).toBe(level);
  });
});
