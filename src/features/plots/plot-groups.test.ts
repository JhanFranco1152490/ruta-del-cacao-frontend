import { describe, expect, it } from 'vitest';

import type { OverviewPlot } from './plot-overview';
import { sectionPlots } from './plot-groups';

const ANA = {
  id: 'p1',
  member_code: 'PROD-000001',
  first_name: 'Ana',
  last_name: 'Prueba',
};
const LUIS = {
  id: 'p2',
  member_code: 'PROD-000002',
  first_name: 'Luis',
  last_name: 'Ejemplo',
};

const plot = (
  id: string,
  farm: { id: string; name: string; producer: typeof ANA },
  over: Partial<OverviewPlot> = {},
): OverviewPlot => ({
  id,
  code: id.toUpperCase(),
  areaHectares: '1.00',
  isActive: true,
  vertices: [],
  version: 1,
  farm: { ...farm, isActive: true },
  ...over,
});

const ESPERANZA = { id: 'f1', name: 'La Esperanza', producer: ANA };
const MANGO = { id: 'f2', name: 'El Mango', producer: ANA };
const PORVENIR = { id: 'f3', name: 'El Porvenir', producer: LUIS };

const shape = (sections: ReturnType<typeof sectionPlots>) =>
  sections.map((section) => [
    section.headers.map(
      (header) =>
        `${header.level}:${header.label}${header.continues ? ' (continúa)' : ''}`,
    ),
    section.plots.map((item) => item.id),
  ]);

const PAGE = [
  plot('a', ESPERANZA),
  plot('b', ESPERANZA),
  plot('c', MANGO),
  plot('d', PORVENIR),
];

describe('sectionPlots', () => {
  it('leaves the list flat without grouping', () => {
    expect(shape(sectionPlots(PAGE, 'ninguno', { byProducer: false }))).toEqual(
      [[[], ['a', 'b', 'c', 'd']]],
    );
  });

  it('opens a group per farm for whoever sees only their own', () => {
    expect(shape(sectionPlots(PAGE, 'finca', { byProducer: false }))).toEqual([
      [['farm:La Esperanza'], ['a', 'b']],
      [['farm:El Mango'], ['c']],
      [['farm:El Porvenir'], ['d']],
    ]);
  });

  it('nests the farms under their producer for the technical account', () => {
    expect(shape(sectionPlots(PAGE, 'finca', { byProducer: true }))).toEqual([
      [
        ['producer:Ana Prueba · PROD-000001', 'farm:La Esperanza'],
        ['a', 'b'],
      ],
      [['farm:El Mango'], ['c']],
      [['producer:Luis Ejemplo · PROD-000002', 'farm:El Porvenir'], ['d']],
    ]);
  });

  it('groups only by producer when asked', () => {
    expect(
      shape(sectionPlots(PAGE, 'productor', { byProducer: true })),
    ).toEqual([
      [['producer:Ana Prueba · PROD-000001'], ['a', 'b', 'c']],
      [['producer:Luis Ejemplo · PROD-000002'], ['d']],
    ]);
  });

  it('says a group continues from the previous page', () => {
    const before = plot('z', ESPERANZA);

    expect(
      shape(sectionPlots(PAGE, 'finca', { byProducer: true, before })),
    ).toEqual([
      [
        [
          'producer:Ana Prueba · PROD-000001 (continúa)',
          'farm:La Esperanza (continúa)',
        ],
        ['a', 'b'],
      ],
      [['farm:El Mango'], ['c']],
      [['producer:Luis Ejemplo · PROD-000002', 'farm:El Porvenir'], ['d']],
    ]);
  });

  it('says only the producer continues when the previous page ended in another of its farms', () => {
    const before = plot('z', { id: 'f0', name: 'Alto', producer: ANA });

    const [first] = sectionPlots(PAGE, 'finca', { byProducer: true, before });
    expect(first.headers).toEqual([
      {
        level: 'producer',
        label: 'Ana Prueba · PROD-000001',
        continues: true,
      },
      { level: 'farm', label: 'La Esperanza', continues: false },
    ]);
  });

  it('puts what waits on the device first, in its own group', () => {
    const pending = plot('q', ESPERANZA, {
      version: undefined,
      queue: { status: 'error', operation: 'create' },
    });

    expect(
      shape(sectionPlots([pending, ...PAGE], 'finca', { byProducer: false })),
    ).toEqual([
      [['device:En este dispositivo'], ['q']],
      [['farm:La Esperanza'], ['a', 'b']],
      [['farm:El Mango'], ['c']],
      [['farm:El Porvenir'], ['d']],
    ]);
  });
});
