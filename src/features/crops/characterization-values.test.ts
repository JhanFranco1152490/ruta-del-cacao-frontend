import { describe, expect, it } from 'vitest';

import { buildCacaoVariety, buildCharacterization } from '@/test/factories';

import {
  queuedSummaryLines,
  queuedToFormInput,
  serverSummaryLines,
  serverToFormInput,
  varietyOptionsFor,
} from './characterization-values';

describe('serverToFormInput', () => {
  it('fills the form with texts and empty lists instead of null', () => {
    expect(serverToFormInput(buildCharacterization())).toEqual({
      plantings: [
        {
          variety_id: 'v-ccn-51',
          planting_date: '2021-03',
          tree_count: '1800',
        },
        { variety_id: 'v-ics-95', planting_date: '2021-03', tree_count: '600' },
      ],
      stage: 'full_production',
      management_system: 'conventional',
      shade_type: '',
    });
  });
});

describe('queuedToFormInput', () => {
  it('turns the pending characterization back into the form', () => {
    expect(
      queuedToFormInput({
        plantings: [
          { variety_id: 'v1', planting_date: '2018-04', tree_count: 900 },
          { variety_id: 'v1', planting_date: '2024-01', tree_count: 300 },
        ],
        stage: 'establishment',
        management_system: null,
        shade_type: 'mixed',
      }),
    ).toEqual({
      plantings: [
        { variety_id: 'v1', planting_date: '2018-04', tree_count: '900' },
        { variety_id: 'v1', planting_date: '2024-01', tree_count: '300' },
      ],
      stage: 'establishment',
      management_system: '',
      shade_type: 'mixed',
    });
  });
});

describe('varietyOptionsFor', () => {
  it('adds the varieties the characterization already has, with their state', () => {
    const characterization = buildCharacterization({
      plantings: [
        {
          variety: { id: 'v-scc-61', name: 'SCC-61', is_active: false },
          planting_date: '2019-05',
          tree_count: 300,
        },
      ],
    });

    expect(
      varietyOptionsFor(
        [
          buildCacaoVariety({
            id: 'v-ccn-51',
            name: 'CCN-51',
            common_names: ['Colección Castro Naranjal'],
          }),
        ],
        characterization,
      ),
    ).toEqual([
      {
        id: 'v-ccn-51',
        name: 'CCN-51',
        isActive: true,
        commonNames: ['Colección Castro Naranjal'],
      },
      { id: 'v-scc-61', name: 'SCC-61', isActive: false, commonNames: [] },
    ]);
  });

  it('offers only the active catalog for a new characterization', () => {
    expect(varietyOptionsFor([buildCacaoVariety()])).toHaveLength(1);
  });
});

describe('summary lines', () => {
  it('take the names from the server', () => {
    expect(serverSummaryLines(buildCharacterization())).toEqual([
      { varietyName: 'CCN-51', treeCount: 1800 },
      { varietyName: 'ICS-95', treeCount: 600 },
    ]);
  });

  it('take the names of a pending characterization from what is known', () => {
    expect(
      queuedSummaryLines(
        {
          plantings: [
            { variety_id: 'v1', planting_date: '2024-01', tree_count: 10 },
            { variety_id: 'v9', planting_date: '2024-01', tree_count: 5 },
          ],
          stage: 'establishment',
          management_system: null,
          shade_type: null,
        },
        new Map([['v1', 'CCN-51']]),
      ),
    ).toEqual([
      { varietyName: 'CCN-51', treeCount: 10 },
      { varietyName: 'Variedad', treeCount: 5 },
    ]);
  });
});
