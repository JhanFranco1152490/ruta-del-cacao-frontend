import { describe, expect, it } from 'vitest';

import type { PestSummary } from './history-api';
import { pestFilterOptions, summaryText } from './history-summary';

const row = (overrides: Partial<PestSummary> = {}): PestSummary => ({
  pest_disease: {
    id: 'monilia',
    name: 'Monilia',
    kind: 'disease',
    is_active: true,
  },
  other_description: null,
  sampling_unit: 'trees',
  latest_incidence: '24.00',
  previous_incidence: '31.00',
  latest_date: '2026-10-19',
  ...overrides,
});

describe('summaryText', () => {
  it('compares the last incidence with the one before, in the unit counted', () => {
    expect(summaryText(row())).toBe('Monilia: 24 % de árboles · antes 31 %');
    expect(
      summaryText(
        row({
          sampling_unit: 'pods',
          latest_incidence: '6.25',
          previous_incidence: null,
        }),
      ),
    ).toBe('Monilia: 6,25 % de mazorcas · primer registro');
  });

  it('names what was written in Other', () => {
    expect(
      summaryText(
        row({ pest_disease: null, other_description: 'Hormigas en hojas' }),
      ),
    ).toBe('Otra (Hormigas en hojas): 24 % de árboles · antes 31 %');
  });
});

describe('pestFilterOptions', () => {
  it('offers each pest of the catalog seen in the plot once, and Other when there is any', () => {
    expect(
      pestFilterOptions([
        row(),
        row({ sampling_unit: 'pods' }),
        row({
          pest_disease: {
            id: 'old',
            name: 'Cochinilla',
            kind: 'pest',
            is_active: false,
          },
        }),
        row({ pest_disease: null, other_description: 'Hormigas en hojas' }),
      ]),
    ).toEqual([
      { value: 'old', label: 'Cochinilla' },
      { value: 'monilia', label: 'Monilia' },
      { value: 'otra', label: 'Otra' },
    ]);
  });

  it('offers the chosen pest while the others have not arrived', () => {
    expect(pestFilterOptions([], { value: 'monilia', rows: [row()] })).toEqual([
      { value: 'monilia', label: 'Monilia' },
    ]);
    expect(pestFilterOptions([], { value: 'otra', rows: [] })).toEqual([
      { value: 'otra', label: 'Otra' },
    ]);
  });

  it('offers nothing in a plot without detections', () => {
    expect(pestFilterOptions([])).toEqual([]);
  });
});
