import { describe, expect, it } from 'vitest';

import { buildFermentation, buildHarvest, buildLot } from '@/test/factories';

import { lotsOfFarm, processesOfFarm, resolveFarmFilter } from './farm-filter';

const options = [
  { id: 'f1', label: 'F01 · La Esperanza', name: 'La Esperanza' },
  { id: 'f2', label: 'F02 · El Mirador', name: 'El Mirador' },
];

describe('resolveFarmFilter', () => {
  it('has no farm when the filter is empty', () => {
    expect(resolveFarmFilter(options, null)).toEqual({
      name: null,
      choice: null,
    });
  });

  it('uses the loaded option of the chosen farm', () => {
    expect(resolveFarmFilter(options, 'f2')).toEqual({
      name: 'El Mirador',
      choice: options[1],
    });
  });

  it('keeps the farm of the address while the options are not loaded', () => {
    expect(resolveFarmFilter([], 'f9')).toEqual({
      name: 'esta finca',
      choice: { id: 'f9', label: 'esta finca' },
    });
  });
});

describe('processesOfFarm', () => {
  const inFarm = (farmId: string, lotId: string) =>
    buildFermentation({
      lot: { ...buildFermentation().lot, id: lotId },
      farm: { id: farmId, code: 'F0', name: 'Finca' },
    });
  const list = [inFarm('f1', 'l1'), inFarm('f2', 'l2')];

  it('keeps those of the chosen farm', () => {
    expect(processesOfFarm(list, 'f2').map(({ lot }) => lot.id)).toEqual([
      'l2',
    ]);
  });

  it('keeps all of them without a farm', () => {
    expect(processesOfFarm(list, null)).toHaveLength(2);
  });
});

describe('lotsOfFarm', () => {
  const harvestIn = (farmId: string) => {
    const harvest = buildHarvest();
    return {
      ...harvest,
      plot: { ...harvest.plot, farm: { ...harvest.plot.farm, id: farmId } },
    };
  };
  const lots = [
    buildLot({ id: 'l1', harvest: harvestIn('f1') }),
    buildLot({ id: 'l2', harvest: harvestIn('f2') }),
  ];

  it('keeps the lots harvested in the chosen farm', () => {
    expect(lotsOfFarm(lots, 'f1').map(({ id }) => id)).toEqual(['l1']);
    expect(lotsOfFarm(lots, null)).toHaveLength(2);
  });
});
