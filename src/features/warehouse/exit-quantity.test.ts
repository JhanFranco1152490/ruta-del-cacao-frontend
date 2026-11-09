import { describe, expect, it } from 'vitest';

import { exitableGrades } from './exit-quantity';

describe('exitableGrades', () => {
  it('offers the grades with stock, G1 first', () => {
    expect(
      exitableGrades([
        { grade: 'g2', quantity_kg: '55.2' },
        { grade: 'g1', quantity_kg: '250.0' },
      ]),
    ).toEqual([
      { grade: 'g1', label: 'G1', availableTenths: 2500 },
      { grade: 'g2', label: 'G2', availableTenths: 552 },
    ]);
  });

  it('leaves out a grade that ran out or was never stored', () => {
    expect(
      exitableGrades([{ grade: 'g1', quantity_kg: '0.0' }]).map(
        ({ grade }) => grade,
      ),
    ).toEqual([]);
    expect(
      exitableGrades([{ grade: 'g2', quantity_kg: '14.0' }]).map(
        ({ grade }) => grade,
      ),
    ).toEqual(['g2']);
  });
});
