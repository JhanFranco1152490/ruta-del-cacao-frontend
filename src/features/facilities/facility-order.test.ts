import { describe, expect, it } from 'vitest';

import { buildFacility } from '@/test/factories';

import { sortFacilities } from './facility-order';

const names = (list: { name: string }[]) => list.map((f) => f.name);

describe('sortFacilities', () => {
  it('puts boxes before dryers', () => {
    const sorted = sortFacilities([
      buildFacility({ id: 'a', name: 'A-1', facility_type: 'solar_dryer' }),
      buildFacility({
        id: 'b',
        name: 'Z-9',
        facility_type: 'fermentation_box',
      }),
    ]);
    expect(names(sorted)).toEqual(['Z-9', 'A-1']);
  });

  it('orders the numbers in a name naturally', () => {
    const sorted = sortFacilities([
      buildFacility({ id: 'a', name: 'C-10' }),
      buildFacility({ id: 'b', name: 'C-2' }),
      buildFacility({ id: 'c', name: 'C-01' }),
    ]);
    expect(names(sorted)).toEqual(['C-01', 'C-2', 'C-10']);
  });

  it('ignores case and accents when ordering by name', () => {
    const sorted = sortFacilities([
      buildFacility({ id: 'a', name: 'Marquesina del patio' }),
      buildFacility({ id: 'b', name: 'marquesina bajo' }),
    ]);
    expect(names(sorted)).toEqual(['marquesina bajo', 'Marquesina del patio']);
  });

  it('does not change the list it receives', () => {
    const list = [
      buildFacility({ id: 'a', name: 'C-2' }),
      buildFacility({ id: 'b', name: 'C-1' }),
    ];
    sortFacilities(list);
    expect(names(list)).toEqual(['C-2', 'C-1']);
  });
});
