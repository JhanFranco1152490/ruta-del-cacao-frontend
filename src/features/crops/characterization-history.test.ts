import { describe, expect, it } from 'vitest';

import { buildSnapshotPlanting } from '@/test/factories';

import {
  describeChanges,
  describeSnapshot,
  type HistorySnapshot,
} from './characterization-history';

const snapshot = (
  plantings = [buildSnapshotPlanting()],
  overrides: Partial<HistorySnapshot> = {},
): HistorySnapshot => ({
  plantings,
  management_system: null,
  shade_type: null,
  ...overrides,
});

describe('describeSnapshot', () => {
  it('says what a version holds: each planting with its trees, propagation and stage', () => {
    expect(
      describeSnapshot(
        snapshot([
          buildSnapshotPlanting(),
          buildSnapshotPlanting({
            variety_id: 'v-ics-95',
            name: 'ICS-95',
            planting_date: '2023-08',
            tree_count: 600,
            propagation: 'seed',
            stage: 'early_production',
          }),
        ]),
      ),
    ).toEqual([
      'CCN-51 (marzo de 2021): 1.800 árboles · Injerto o clon · Producción estable',
      'ICS-95 (agosto de 2023): 600 árboles · Semilla · Inicio de producción',
    ]);
  });

  it('adds the management and the shade only when they were chosen', () => {
    expect(
      describeSnapshot(
        snapshot([], { management_system: 'organic', shade_type: 'mixed' }),
      ),
    ).toEqual([
      'Sistema de manejo: Orgánico',
      'Tipo de sombra: Temporal y permanente',
    ]);
    expect(describeSnapshot(snapshot([]))).toEqual([]);
  });

  it('uses the singular for one tree', () => {
    expect(
      describeSnapshot(snapshot([buildSnapshotPlanting({ tree_count: 1 })]))[0],
    ).toContain('1 árbol ·');
  });
});

describe('describeChanges', () => {
  const before = snapshot([buildSnapshotPlanting()]);

  it('says nothing changed when the values are the same', () => {
    expect(
      describeChanges(before, snapshot([buildSnapshotPlanting()])),
    ).toEqual([]);
  });

  it('describes the first version by what it holds', () => {
    expect(describeChanges(null, before)).toEqual(describeSnapshot(before));
  });

  it('names the moment a planting goes from one stage to another', () => {
    expect(
      describeChanges(
        before,
        snapshot([buildSnapshotPlanting({ stage: 'renovation' })]),
      ),
    ).toEqual([
      'Etapa de CCN-51 (marzo de 2021): Producción estable → Renovación o rehabilitación',
    ]);
  });

  it('reports the change of trees with thousands separators', () => {
    expect(
      describeChanges(
        before,
        snapshot([buildSnapshotPlanting({ tree_count: 1500 })]),
      ),
    ).toEqual(['Árboles de CCN-51 (marzo de 2021): 1.800 → 1.500']);
  });

  it('reports the change of propagation', () => {
    expect(
      describeChanges(
        before,
        snapshot([buildSnapshotPlanting({ propagation: 'seed' })]),
      ),
    ).toEqual([
      'Propagación de CCN-51 (marzo de 2021): Injerto o clon → Semilla',
    ]);
  });

  it('tells apart two plantings of the same variety by their month', () => {
    const old = buildSnapshotPlanting({ planting_date: '2018-04' });
    const recent = buildSnapshotPlanting({
      planting_date: '2024-02',
      stage: 'establishment',
    });

    expect(
      describeChanges(
        snapshot([old, recent]),
        snapshot([old, { ...recent, stage: 'early_production' }]),
      ),
    ).toEqual([
      'Etapa de CCN-51 (febrero de 2024): Establecimiento o formación → Inicio de producción',
    ]);
  });

  it('reports a planting that was added', () => {
    expect(
      describeChanges(
        before,
        snapshot([
          buildSnapshotPlanting(),
          buildSnapshotPlanting({
            variety_id: 'v-ics-95',
            name: 'ICS-95',
            planting_date: '2024-02',
            tree_count: 500,
            stage: 'establishment',
          }),
        ]),
      ),
    ).toEqual([
      'Se agregó una siembra de ICS-95 (febrero de 2024): 500 árboles · Injerto o clon · Establecimiento o formación',
    ]);
  });

  it('reports a planting that was removed', () => {
    expect(
      describeChanges(
        snapshot([
          buildSnapshotPlanting(),
          buildSnapshotPlanting({
            variety_id: 'v-ics-95',
            name: 'ICS-95',
            planting_date: '2024-02',
          }),
        ]),
        before,
      ),
    ).toEqual(['Se quitó la siembra de ICS-95 (febrero de 2024)']);
  });

  it('reports the management and the shade, also when they are cleared', () => {
    expect(
      describeChanges(
        snapshot([buildSnapshotPlanting()], {
          management_system: 'conventional',
        }),
        snapshot([buildSnapshotPlanting()], {
          management_system: null,
          shade_type: 'permanent',
        }),
      ),
    ).toEqual([
      'Sistema de manejo: Convencional → Sin especificar',
      'Tipo de sombra: Sin especificar → Sombra permanente (maderables o frutales)',
    ]);
  });

  it('follows a planting by its variety, using the name it had in that version', () => {
    expect(
      describeChanges(
        before,
        snapshot([
          buildSnapshotPlanting({
            name: 'CCN-51 (renombrada)',
            tree_count: 10,
          }),
        ]),
      ),
    ).toEqual(['Árboles de CCN-51 (renombrada) (marzo de 2021): 1.800 → 10']);
  });

  it('does not break with a version saved in an older shape', () => {
    const old = {
      stage: 'renovation',
      varieties: [],
    } as unknown as HistorySnapshot;

    expect(() => describeSnapshot(old)).not.toThrow();
    expect(() => describeChanges(old, before)).not.toThrow();
    expect(() => describeChanges(before, old)).not.toThrow();
  });
});
