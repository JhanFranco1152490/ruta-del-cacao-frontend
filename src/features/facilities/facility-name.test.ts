import { describe, expect, it } from 'vitest';

import { buildFacility } from '@/test/factories';

import { suggestFacilityName } from './facility-name';

const esperanza = {
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
  is_active: true,
};
const diviso = { id: 'f2', code: 'F02', name: 'El Diviso', is_active: true };
const box = (name: string, farm = esperanza) =>
  buildFacility({ id: name + farm.id, name, farm });
const dryer = (name: string, farm = esperanza) =>
  buildFacility({
    id: name + farm.id,
    name,
    farm,
    facility_type: 'solar_dryer',
  });

describe('suggestFacilityName', () => {
  it('starts at 01 in a farm without facilities, with the letter of the type', () => {
    expect(suggestFacilityName([], 'f1', 'fermentation_box')).toBe('C-01');
    expect(suggestFacilityName([], 'f1', 'solar_dryer')).toBe('M-01');
  });

  it('follows the highest number of that type, even when one is missing', () => {
    const known = [box('C-01'), box('C-03'), dryer('M-07')];

    expect(suggestFacilityName(known, 'f1', 'fermentation_box')).toBe('C-04');
    expect(suggestFacilityName(known, 'f1', 'solar_dryer')).toBe('M-08');
  });

  it('reads the names however they were written', () => {
    const known = [box('c 02'), box('C5'), box('Cajón del patio')];

    expect(suggestFacilityName(known, 'f1', 'fermentation_box')).toBe('C-06');
  });

  it('only counts the facilities of the farm', () => {
    const known = [box('C-04', diviso), box('C-02')];

    expect(suggestFacilityName(known, 'f1', 'fermentation_box')).toBe('C-03');
    expect(suggestFacilityName(known, 'f2', 'fermentation_box')).toBe('C-05');
  });

  it('skips a name taken by the other type, since names are unique in the farm', () => {
    const known = [dryer('C-01')];

    expect(suggestFacilityName(known, 'f1', 'fermentation_box')).toBe('C-02');
  });

  it('goes past two digits', () => {
    expect(suggestFacilityName([box('C-99')], 'f1', 'fermentation_box')).toBe(
      'C-100',
    );
  });
});
