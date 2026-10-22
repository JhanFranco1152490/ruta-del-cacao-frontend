import { describe, expect, it } from 'vitest';

import { buildFarm } from '@/test/factories';

import {
  type FarmListItem,
  mergeFarmLists,
  serverFarmToListItem,
} from './farm-list-item';

const queued = (id: string, name: string, municipalityCode: string) =>
  ({
    ...serverFarmToListItem(buildFarm({ id, name })),
    municipalityCode,
    status: 'pending',
  }) as FarmListItem;

describe('mergeFarmLists', () => {
  it('puts the device first and hides its copy from the server', () => {
    const farms = mergeFarmLists(
      [queued('f1', 'La Loma editada', '54001')],
      [
        buildFarm({ id: 'f1', name: 'La Loma' }),
        buildFarm({ id: 'f2', name: 'El Alto' }),
      ],
      { search: undefined, municipality: null },
    );

    expect(farms.map(({ name }) => name)).toEqual([
      'La Loma editada',
      'El Alto',
    ]);
  });

  it('filters the device by name and municipality, but still hides the server copy', () => {
    const farms = mergeFarmLists(
      [queued('f1', 'La Loma', '54001'), queued('f3', 'Bella Vista', '54003')],
      [buildFarm({ id: 'f1', name: 'La Loma' })],
      { search: 'loma', municipality: '54003' },
    );

    expect(farms).toEqual([]);
  });
});
