import { describe, expect, it } from 'vitest';

import { formatDecimal } from './decimal';

describe('formatDecimal', () => {
  it('reads an api decimal with a comma and without trailing zeros', () => {
    expect(formatDecimal('46.50')).toBe('46,5');
    expect(formatDecimal('50.00')).toBe('50');
    expect(formatDecimal('2.45')).toBe('2,45');
  });

  it('rounds to two decimals unless told otherwise', () => {
    expect(formatDecimal('3.785')).toBe('3,79');
    expect(formatDecimal('3.785', 3)).toBe('3,785');
    expect(formatDecimal('2.46', 1)).toBe('2,5');
  });
});
