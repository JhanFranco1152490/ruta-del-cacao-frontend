import { describe, expect, it } from 'vitest';

import { SWIPE_MIN_DISTANCE, swipeDirection } from './swipe';

const from = { x: 200, y: 300 };

describe('swipeDirection', () => {
  it('is left or right for a wide horizontal gesture', () => {
    expect(swipeDirection(from, { x: 200 - SWIPE_MIN_DISTANCE, y: 300 })).toBe(
      'left',
    );
    expect(swipeDirection(from, { x: 200 + SWIPE_MIN_DISTANCE, y: 300 })).toBe(
      'right',
    );
  });

  it('ignores a short gesture, so a tap or a small slip does not change the period', () => {
    expect(
      swipeDirection(from, { x: 200 - SWIPE_MIN_DISTANCE + 1, y: 300 }),
    ).toBeNull();
    expect(swipeDirection(from, { x: 230, y: 300 })).toBeNull();
    expect(swipeDirection(from, from)).toBeNull();
  });

  it('ignores a gesture that is more vertical than horizontal, which is a scroll', () => {
    expect(swipeDirection(from, { x: 200 - 130, y: 300 + 100 })).toBeNull();
    expect(swipeDirection(from, { x: 200 + 130, y: 300 - 140 })).toBeNull();
  });

  it('accepts a wide gesture that drifts a little up or down', () => {
    expect(swipeDirection(from, { x: 200 - 160, y: 300 + 50 })).toBe('left');
  });

  it('asks for a wide gesture', () => {
    expect(SWIPE_MIN_DISTANCE).toBeGreaterThanOrEqual(100);
  });
});
