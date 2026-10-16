import { describe, expect, it } from 'vitest';

import type { PlotOption } from '@/lib/api/plot-options';
import type { components } from '@/lib/api/schema';

import { harvestPlotChoices, NOT_CHARACTERIZED_DETAIL } from './harvest-plots';

type PlotCharacterization = components['schemas']['PlotCharacterization'];

const PRODUCER = {
  id: 'p1',
  member_code: 'PROD-000123',
  first_name: 'Ana',
  last_name: 'Prueba',
};

const plot = (id: string, code: string, name: string | null): PlotOption => ({
  id,
  code,
  name,
  areaHectares: '2.40',
  isActive: true,
  farm: {
    id: 'f1',
    code: 'F02',
    name: 'La Esperanza',
    isActive: true,
    producer: PRODUCER,
  },
});

const characterization = (plotId: string): PlotCharacterization => ({
  plot_id: plotId,
  plantings: [
    {
      variety: { id: 'v1', name: 'CCN-51', is_active: true },
      planting_date: '2019-02',
      tree_count: 100,
      propagation: 'grafted',
      stage: 'full_production',
    },
    {
      variety: { id: 'v2', name: 'ICS-95', is_active: true },
      planting_date: '2021-03',
      tree_count: 80,
      propagation: 'grafted',
      stage: 'full_production',
    },
  ],
  total_trees: 180,
  management_system: null,
  shade_type: null,
  version: 3,
  captured_at: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
});

const choices = (
  overrides: Partial<Parameters<typeof harvestPlotChoices>[0]> = {},
) =>
  harvestPlotChoices({
    plots: [plot('pl1', 'P05', 'Lote del río'), plot('pl2', 'P06', null)],
    characterizations: [characterization('pl1')],
    pendingCharacterizations: new Set(),
    showProducer: false,
    ...overrides,
  });

describe('harvestPlotChoices', () => {
  it('offers each plot under its farm, with its area and varieties', () => {
    const [first] = choices();

    expect(first).toMatchObject({
      id: 'pl1',
      label: 'P05 · Lote del río',
      group: 'F02 · La Esperanza',
      detail: '2,4 ha · CCN-51, ICS-95',
      disabled: false,
      areaHectares: '2.40',
      farmId: 'f1',
      producerId: 'p1',
      characterizationPending: false,
    });
    expect(first.varieties.map(({ id }) => id)).toEqual(['v1', 'v2']);
  });

  it('shows a plot without plantings but does not let it be chosen, saying why', () => {
    const [, second] = choices();

    expect(second).toMatchObject({
      label: 'P06',
      disabled: true,
      detail: NOT_CHARACTERIZED_DETAIL,
      varieties: [],
    });
  });

  it('marks the plot whose characterization waits on the device', () => {
    const [first] = choices({ pendingCharacterizations: new Set(['pl1']) });

    expect(first.characterizationPending).toBe(true);
  });

  it('says whose farm it is to the technical account', () => {
    const [first] = choices({ showProducer: true });

    expect(first.group).toBe('F02 · La Esperanza · Ana Prueba · PROD-000123');
  });
});
