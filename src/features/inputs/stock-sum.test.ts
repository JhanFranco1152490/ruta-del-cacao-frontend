import { describe, expect, it } from 'vitest';

import { sumQuantities } from './stock-sum';

describe('sumQuantities', () => {
  it('adds with three decimals and no floating point error', () => {
    expect(sumQuantities(['0.100', '0.200'])).toBe('0.300');
    expect(sumQuantities(['250.000', '12.345'])).toBe('262.345');
  });

  it('keeps the sign: negative stocks subtract', () => {
    expect(sumQuantities(['100.000', '-120.500'])).toBe('-20.500');
    expect(sumQuantities(['-0.500', '0.500'])).toBe('0.000');
  });

  it('accepts values without decimals and a single value', () => {
    expect(sumQuantities(['5'])).toBe('5.000');
    expect(sumQuantities(['1', '2.5'])).toBe('3.500');
  });

  it('is zero without values', () => {
    expect(sumQuantities([])).toBe('0.000');
  });
});
