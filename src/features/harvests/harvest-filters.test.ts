import { describe, expect, it } from 'vitest';

import { buildHarvest } from '@/test/factories';

import { filterHarvests, harvestTotals } from './harvest-filters';

const harvest = (
  id: string,
  over: {
    farm?: string;
    plot?: string;
    variety?: string;
    collector?: string;
    kg?: string;
    inLot?: boolean;
  } = {},
) => {
  const base = buildHarvest();
  return buildHarvest({
    id,
    plot: {
      ...base.plot,
      id: over.plot ?? 'pl1',
      farm: { ...base.plot.farm, id: over.farm ?? 'f1' },
    },
    variety: {
      id: over.variety ?? 'ccn',
      name: (over.variety ?? 'ccn').toUpperCase(),
      is_active: true,
    },
    collector: { id: over.collector ?? 'u1', full_name: 'X', is_active: true },
    green_weight_kg: over.kg ?? '100.0',
    lot: over.inLot
      ? { id: `l-${id}`, code: '000001-F01-P01-261014-1', status: 'generated' }
      : null,
  });
};

const harvests = [
  harvest('a', { farm: 'f1', plot: 'pl1', variety: 'ccn', kg: '120.5' }),
  harvest('b', {
    farm: 'f1',
    plot: 'pl2',
    variety: 'ics',
    kg: '80.3',
    inLot: true,
  }),
  harvest('c', {
    farm: 'f2',
    plot: 'pl3',
    variety: 'ccn',
    collector: 'u2',
    kg: '40',
  }),
];
const ids = (list: { id: string }[]) => list.map(({ id }) => id);

describe('filterHarvests', () => {
  it('keeps everything without filters', () => {
    expect(ids(filterHarvests(harvests, {}))).toEqual(['a', 'b', 'c']);
  });

  it('filters by farm, plot, variety and collector', () => {
    expect(ids(filterHarvests(harvests, { farm: 'f1' }))).toEqual(['a', 'b']);
    expect(ids(filterHarvests(harvests, { plot: 'pl3' }))).toEqual(['c']);
    expect(ids(filterHarvests(harvests, { variety: 'ccn' }))).toEqual([
      'a',
      'c',
    ]);
    expect(ids(filterHarvests(harvests, { collector: 'u2' }))).toEqual(['c']);
  });

  it('filters by whether the harvest is in a lot', () => {
    expect(ids(filterHarvests(harvests, { lot: 'with' }))).toEqual(['b']);
    expect(ids(filterHarvests(harvests, { lot: 'without' }))).toEqual([
      'a',
      'c',
    ]);
  });

  it('combines the filters', () => {
    expect(
      ids(filterHarvests(harvests, { farm: 'f1', variety: 'ccn' })),
    ).toEqual(['a']);
  });
});

describe('harvestTotals', () => {
  it('adds up the month, what has no lot and each variety, without float errors', () => {
    expect(harvestTotals(harvests)).toEqual({
      count: 3,
      kg: '240.8',
      withoutLot: { count: 2, kg: '160.5' },
      byVariety: [
        { id: 'ccn', name: 'CCN', kg: '160.5' },
        { id: 'ics', name: 'ICS', kg: '80.3' },
      ],
    });
  });

  it('is zero for an empty month', () => {
    expect(harvestTotals([])).toEqual({
      count: 0,
      kg: '0.0',
      withoutLot: { count: 0, kg: '0.0' },
      byVariety: [],
    });
  });
});
