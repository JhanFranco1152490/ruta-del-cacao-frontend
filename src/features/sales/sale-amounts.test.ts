import { describe, expect, it } from 'vitest';

import { lineSubtotal, saleTotals } from './sale-amounts';

describe('lineSubtotal', () => {
  it('rounds half a peso up, like the server', () => {
    expect(lineSubtotal('12,5', '17999')).toBe(224988);
    expect(lineSubtotal('0.1', '5')).toBe(1);
    expect(lineSubtotal('0.1', '4')).toBe(0);
  });

  it('multiplies whole kilos and prices exactly', () => {
    expect(lineSubtotal('150', '18.500')).toBe(2775000);
    expect(lineSubtotal('40,0', '15000')).toBe(600000);
  });

  it('stays exact at the largest sale the server accepts', () => {
    expect(lineSubtotal('999999.9', '1000000')).toBe(999999900000);
  });

  it('has no subtotal while a value is missing or wrong', () => {
    expect(lineSubtotal('', '18500')).toBeNull();
    expect(lineSubtotal('150', '')).toBeNull();
    expect(lineSubtotal('0', '18500')).toBeNull();
    expect(lineSubtotal('150', '18,5')).toBeNull();
  });
});

describe('saleTotals', () => {
  it('adds the subtotals and the kilos of each grade', () => {
    expect(
      saleTotals([
        { grade: 'g1', quantity_kg: '150,0', price_per_kg: '18500' },
        { grade: 'g2', quantity_kg: '40', price_per_kg: '15.000' },
        { grade: 'g1', quantity_kg: '0,1', price_per_kg: '18500' },
      ]),
    ).toEqual({
      total: 3376850,
      g1Tenths: 1501,
      g2Tenths: 400,
      lineCount: 3,
    });
  });

  it('leaves out a line that is not complete', () => {
    expect(
      saleTotals([
        { grade: 'g1', quantity_kg: '150', price_per_kg: '' },
        { grade: null, quantity_kg: '', price_per_kg: '' },
      ]),
    ).toEqual({ total: 0, g1Tenths: 0, g2Tenths: 0, lineCount: 0 });
  });
});
