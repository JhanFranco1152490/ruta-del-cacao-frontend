import { describe, expect, it } from 'vitest';

import { buildFacility } from '@/test/factories';

import {
  ALL_FACILITIES,
  facilitiesOfFarm,
  filterFacilities,
  hasActiveFilters,
  noMatchesText,
} from './facility-filters';

const esperanza = {
  id: 'f1',
  code: 'F02',
  name: 'La Esperanza',
  is_active: true,
};
const diviso = { id: 'f2', code: 'F03', name: 'El Diviso', is_active: true };

const list = [
  buildFacility({ id: '1', name: 'C-02', farm: esperanza }),
  buildFacility({
    id: '2',
    name: 'C-01',
    farm: esperanza,
    is_active: false,
    status: 'inactive',
  }),
  buildFacility({
    id: '3',
    name: 'M-01',
    farm: esperanza,
    facility_type: 'solar_dryer',
  }),
  buildFacility({ id: '4', name: 'C-03', farm: diviso }),
];

const ids = (facilities: { id: string }[]) => facilities.map((f) => f.id);

describe('facilitiesOfFarm', () => {
  it('keeps only the facilities of the farm', () => {
    expect(ids(facilitiesOfFarm(list, 'f2'))).toEqual(['4']);
  });
});

describe('filterFacilities', () => {
  it('shows every facility of the farm, sorted, with no filters', () => {
    expect(ids(filterFacilities(list, 'f1', ALL_FACILITIES))).toEqual([
      '2',
      '1',
      '3',
    ]);
  });

  it('filters by type', () => {
    expect(
      ids(filterFacilities(list, 'f1', { type: 'solar_dryer', status: 'all' })),
    ).toEqual(['3']);
  });

  it('filters by status', () => {
    expect(
      ids(filterFacilities(list, 'f1', { type: 'all', status: 'inactive' })),
    ).toEqual(['2']);
  });

  it('combines both filters', () => {
    expect(
      filterFacilities(list, 'f1', {
        type: 'solar_dryer',
        status: 'inactive',
      }),
    ).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('is false only when both filters show everything', () => {
    expect(hasActiveFilters(ALL_FACILITIES)).toBe(false);
    expect(hasActiveFilters({ type: 'fermentation_box', status: 'all' })).toBe(
      true,
    );
    expect(hasActiveFilters({ type: 'all', status: 'occupied' })).toBe(true);
  });
});

describe('noMatchesText', () => {
  it('repeats the filter, agreeing with the type', () => {
    expect(noMatchesText({ type: 'solar_dryer', status: 'inactive' })).toBe(
      'Ninguna marquesina inactiva.',
    );
    expect(
      noMatchesText({ type: 'fermentation_box', status: 'occupied' }),
    ).toBe('Ningún cajón ocupado.');
    expect(noMatchesText({ type: 'fermentation_box', status: 'all' })).toBe(
      'Ningún cajón.',
    );
    expect(noMatchesText({ type: 'all', status: 'available' })).toBe(
      'Ningún elemento disponible.',
    );
  });
});
