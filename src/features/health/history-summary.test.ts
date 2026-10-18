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
  const catalog = [
    { id: 'trips', name: 'Trips' },
    { id: 'monilia', name: 'Monilia' },
  ];

  it('offers each pest of the catalog by name, and Other at the end', () => {
    expect(pestFilterOptions(catalog, null)).toEqual([
      { value: 'monilia', label: 'Monilia' },
      { value: 'trips', label: 'Trips' },
      { value: 'otra', label: 'Otra' },
    ]);
  });

  it('still offers Other while the catalog has not arrived or was never loaded', () => {
    expect(pestFilterOptions(undefined, null)).toEqual([
      { value: 'otra', label: 'Otra' },
    ]);
  });

  it('offers the chosen pest even if it is no longer in the active catalog', () => {
    expect(pestFilterOptions(catalog, 'old')).toEqual([
      { value: 'monilia', label: 'Monilia' },
      { value: 'trips', label: 'Trips' },
      { value: 'otra', label: 'Otra' },
      { value: 'old', label: 'Plaga elegida' },
    ]);
  });

  it('does not repeat the chosen one that is already offered', () => {
    expect(
      pestFilterOptions(catalog, 'monilia').filter(
        ({ value }) => value === 'monilia',
      ),
    ).toHaveLength(1);
  });
});
