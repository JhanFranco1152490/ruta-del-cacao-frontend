import { describe, expect, it } from 'vitest';

import { evaluationSum } from './evaluation-sum';

const sum = (well: string, moldy: string, other: string) =>
  evaluationSum({
    well_fermented_pct: well,
    moldy_pct: moldy,
    other_defects_pct: other,
  });

describe('evaluationSum', () => {
  it('says the sum and what is left for the other categories', () => {
    expect(sum('85', '2', '5').line).toBe(
      'Suma: 92,0 % · 8,0 % en otras categorías',
    );
  });

  it('accepts a decimal comma and adds without floating point noise', () => {
    expect(sum('0,1', '0.2', '99,7')).toEqual({
      exceeds: false,
      line: 'Suma: 100,0 % · 0,0 % en otras categorías',
    });
  });

  it('refuses a sum over 100', () => {
    expect(sum('90', '8', '2,1')).toEqual({
      exceeds: true,
      line: 'La suma no puede pasar de 100 %',
    });
  });

  it('counts empty, malformed and negative fields as zero', () => {
    expect(sum('', 'abc', '-5').line).toBe(
      'Suma: 0,0 % · 100,0 % en otras categorías',
    );
  });
});
