import { describe, expect, it } from 'vitest';

import { computeYield, yieldText } from './yield';

describe('computeYield', () => {
  it('divides the dry weight by the green weight, with one decimal', () => {
    expect(computeYield('91.7', '240.0')).toBe(38.2);
    expect(computeYield('120', '240')).toBe(50);
  });

  // 38,25 sube a 38,3: la mitad hacia arriba, como el servidor.
  it('rounds the half up', () => {
    expect(computeYield('76.5', '200.0')).toBe(38.3);
    expect(computeYield('0.5', '200.0')).toBe(0.3);
  });

  it('has no yield without a dry weight or with a green weight of zero', () => {
    expect(computeYield('', '240.0')).toBeNull();
    expect(computeYield('abc', '240.0')).toBeNull();
    expect(computeYield('90', '0')).toBeNull();
  });

  it('writes the yield with a fixed decimal and the percent sign', () => {
    expect(yieldText(38.2)).toBe('38,2 %');
    expect(yieldText('50')).toBe('50,0 %');
  });
});
