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
      varieties: [
        { variety_id: 'v-ccn-51', tree_count: '1800' },
        { variety_id: 'v-ics-95', tree_count: '600' },
      ],
      planting_date: '2021-03',
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
        varieties: [{ variety_id: 'v1', tree_count: 900 }],
        planting_date: '2024-01',
        stage: 'establishment',
        management_system: null,
        shade_type: 'mixed',
      }),
    ).toEqual({
      varieties: [{ variety_id: 'v1', tree_count: '900' }],
      planting_date: '2024-01',
      stage: 'establishment',
      management_system: '',
      shade_type: 'mixed',
    });
  });
});

describe('varietyOptionsFor', () => {
  it('adds the varieties the characterization already has, with their state', () => {
    const characterization = buildCharacterization({
      varieties: [
        {
          variety: { id: 'v-scc-61', name: 'SCC-61', is_active: false },
          tree_count: 300,
        },
      ],
    });

    expect(
      varietyOptionsFor(
        [buildCacaoVariety({ id: 'v-ccn-51', name: 'CCN-51' })],
        characterization,
      ),
    ).toEqual([
      { id: 'v-ccn-51', name: 'CCN-51', isActive: true },
      { id: 'v-scc-61', name: 'SCC-61', isActive: false },
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
          varieties: [
            { variety_id: 'v1', tree_count: 10 },
            { variety_id: 'v9', tree_count: 5 },
          ],
          planting_date: '2024-01',
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
