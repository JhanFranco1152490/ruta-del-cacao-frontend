import { describe, expect, it } from 'vitest';

import { maskValue } from './mask';

describe('maskValue', () => {
  it('shows only the last four characters', () => {
    expect(maskValue('1234567890')).toBe('••••7890');
  });

  it('masks completely values of four characters or fewer', () => {
    expect(maskValue('1234')).toBe('••••');
    expect(maskValue('12')).toBe('••••');
  });
});
