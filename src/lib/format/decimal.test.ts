import { describe, expect, it } from 'vitest';

import { formatDecimal } from './decimal';

describe('formatDecimal', () => {
  it('reads an api decimal with a comma and without trailing zeros', () => {
    expect(formatDecimal('46.50')).toBe('46,5');
    expect(formatDecimal('50.00')).toBe('50');
    expect(formatDecimal('2.45')).toBe('2,45');
  });
});
