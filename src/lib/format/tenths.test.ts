import { describe, expect, it } from 'vitest';

import { fromTenths, sumTenths, toTenths } from './tenths';

describe('toTenths', () => {
  it('reads a decimal with comma or point as whole tenths', () => {
    expect(toTenths('250,0')).toBe(2500);
    expect(toTenths(' 55.2 ')).toBe(552);
    expect(toTenths('0.3')).toBe(3);
  });

  it('gives null for what is not a number', () => {
    expect(toTenths('')).toBeNull();
    expect(toTenths('abc')).toBeNull();
    expect(toTenths('1,2,3')).toBeNull();
  });
});

describe('sumTenths', () => {
  it('adds without the floating point drift of 0,1 + 0,2', () => {
    expect(fromTenths(sumTenths(['0,1', '0,2']))).toBe(0.3);
  });

  it('counts an empty, wrong or negative field as zero', () => {
    expect(sumTenths(['5', '', 'x', '-2'])).toBe(50);
  });
});
