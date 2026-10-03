import { describe, expect, it } from 'vitest';

import { areaHectaresField, decimalPattern, isDecimal } from './decimal';

describe('areaHectaresField', () => {
  it('accepts a positive area and turns the decimal comma into a point', () => {
    expect(areaHectaresField().parse(' 2,4 ')).toBe('2.4');
  });

  it.each(['', '0', '-1', 'abc'])('rejects %j as an area', (value) => {
    expect(areaHectaresField().safeParse(value).success).toBe(false);
  });

  it('rejects more decimals than the API stores', () => {
    const result = areaHectaresField().safeParse('2.345');

    expect(result.error?.issues[0].message).toBe('Usa máximo 2 decimales.');
  });
});

describe('decimal helpers', () => {
  it('tell decimals from other text', () => {
    expect(isDecimal('-72.5')).toBe(true);
    expect(isDecimal('7.')).toBe(false);
    expect(decimalPattern(2).test('1.234')).toBe(false);
  });
});
