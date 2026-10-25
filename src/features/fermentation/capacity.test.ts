import { describe, expect, it } from 'vitest';

import { exceedsCapacity } from './capacity';

describe('exceedsCapacity', () => {
  it('is true when the lot weighs more than the box holds', () => {
    expect(exceedsCapacity('820.0', '600.0')).toBe(true);
    expect(exceedsCapacity('600.1', '600.0')).toBe(true);
  });

  it('is false when the lot fits, right up to the capacity', () => {
    expect(exceedsCapacity('500.0', '600.0')).toBe(false);
    expect(exceedsCapacity('600.0', '600')).toBe(false);
  });
});
