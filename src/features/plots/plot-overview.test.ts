import { describe, expect, it } from 'vitest';

import { buildPlot } from '@/test/factories';

import type { QueuedPlot } from './plot-queue';
import { mergeOverviewPlots } from './plot-overview';

const queued = (
  over: Partial<QueuedPlot> = {},
  code = 'P-nueva',
): QueuedPlot => ({
  id: 'q1',
  farmId: 'f1',
  operation: 'create',
  status: 'pending',
  values: { code, area_hectares: '1.00', vertices: [] },
  ...over,
});

const noFarms = new Map();

describe('mergeOverviewPlots', () => {
  it('lists the server page with the farm of each plot', () => {
    const [plot] = mergeOverviewPlots([buildPlot()], [], {}, noFarms);

    expect(plot).toMatchObject({
      code: 'P1',
      isActive: true,
      farm: { id: 'f1', name: 'La Esperanza', isActive: true },
    });
    expect(plot.farm.producer?.member_code).toBe('PROD-000007');
  });

  it('puts what waits on the device first, in code order', () => {
    const plots = mergeOverviewPlots(
      [buildPlot({ id: 's1', code: 'A1' })],
      [queued({ id: 'q2' }, 'Z9'), queued()],
      {},
      noFarms,
    );

    expect(plots.map((plot) => [plot.code, plot.queue?.status])).toEqual([
      ['P-nueva', 'pending'],
      ['Z9', 'pending'],
      ['A1', undefined],
    ]);
  });

  it('replaces the server copy of a plot edited on the device', () => {
    const plots = mergeOverviewPlots(
      [buildPlot({ id: 's1', code: 'Viejo', is_active: false })],
      [
        queued(
          {
            id: 's1',
            operation: 'update',
            status: 'error',
            errorMessage: 'Se superpone con P2.',
          },
          'Nuevo',
        ),
      ],
      {},
      noFarms,
    );

    expect(plots).toHaveLength(1);
    expect(plots[0]).toMatchObject({
      code: 'Nuevo',
      isActive: false,
      version: 1,
      queue: { status: 'error', errorMessage: 'Se superpone con P2.' },
      farm: { name: 'La Esperanza' },
    });
  });

  it('names the farm of a new plot from the known farms, or leaves it unnamed', () => {
    const known = new Map([['f1', { name: 'El Mango', isActive: true }]]);

    const [named] = mergeOverviewPlots([], [queued()], {}, known);
    const [unnamed] = mergeOverviewPlots(
      [],
      [queued({ farmId: 'f9' })],
      {},
      known,
    );

    expect(named.farm).toEqual({ id: 'f1', name: 'El Mango', isActive: true });
    expect(unnamed.farm).toEqual({ id: 'f9', isActive: true });
  });

  it('filters what waits on the device by farm and code', () => {
    const plots = mergeOverviewPlots(
      [],
      [
        queued({ id: 'a' }, 'Árbol'),
        queued({ id: 'b', farmId: 'f2' }, 'Arbol 2'),
        queued({ id: 'c' }, 'Río'),
      ],
      { farm: 'f1', search: 'arbol' },
      noFarms,
    );

    expect(plots.map((plot) => plot.id)).toEqual(['a']);
  });

  it('keeps only the device plots of the chosen producer', () => {
    const known = new Map([['f1', { name: 'Suya', isActive: true }]]);

    const plots = mergeOverviewPlots(
      [buildPlot({ id: 's1', code: 'En servidor' })],
      [
        queued({ id: 'mine' }),
        queued({ id: 'other', farmId: 'f2' }),
        queued({ id: 's1', operation: 'update', farmId: 'f3' }),
      ],
      { producer: 'p1' },
      known,
    );

    expect(plots.map((plot) => plot.id).sort()).toEqual(['mine', 's1']);
  });
});
