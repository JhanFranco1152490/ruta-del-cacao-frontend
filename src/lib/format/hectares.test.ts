import { describe, expect, it } from 'vitest';

import {
  allocatedPercentage,
  availableHectares,
  formatHectares,
} from './hectares';

describe('formatHectares', () => {
  it('drops needless zeros and uses the decimal comma', () => {
    expect(formatHectares('2.40')).toBe('2,4 ha');
    expect(formatHectares('10.00')).toBe('10 ha');
    expect(formatHectares('0.05')).toBe('0,05 ha');
  });
});

describe('availableHectares', () => {
  it('subtracts without floating point noise', () => {
    expect(availableHectares('10.00', '6.00')).toBe('4.00');
    expect(availableHectares('0.30', '0.10')).toBe('0.20');
  });
});

describe('allocatedPercentage', () => {
  it('is the rounded share of the farm area that is assigned', () => {
    expect(allocatedPercentage('10.00', '6.00')).toBe(60);
    expect(allocatedPercentage('3.00', '1.00')).toBe(33);
  });

  it('stays between 0 and 100', () => {
    expect(allocatedPercentage('0.00', '1.00')).toBe(0);
    expect(allocatedPercentage('10.00', '12.00')).toBe(100);
  });
});
