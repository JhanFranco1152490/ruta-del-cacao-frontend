import { describe, expect, it } from 'vitest';

import { pestFilterOptions } from './history-summary';

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
