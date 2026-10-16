import { describe, expect, it } from 'vitest';

import { buildPlot, buildVertex } from '@/test/factories';

import { mergeKnownPlots } from './known-plots';
import type { QueuedPlot } from './plot-queue';

const queued = (over: Partial<QueuedPlot> = {}): QueuedPlot => ({
  id: 'q1',
  farmId: 'f1',
  operation: 'create',
  status: 'pending',
  values: { name: 'La loma', area_hectares: '1.00', vertices: [] },
  ...over,
});

describe('mergeKnownPlots', () => {
  it('knows the server plots with their vertices', () => {
    const [plot] = mergeKnownPlots(
      [
        buildPlot({
          code: 'P1',
          boundary: [
            buildVertex('-72.5', '7.8'),
            buildVertex('-72.4', '7.8'),
            buildVertex('-72.4', '7.9'),
          ],
        }),
      ],
      [],
    );

    expect(plot).toMatchObject({ code: 'P1', isActive: true, version: 1 });
    expect(plot.queue).toBeUndefined();
    expect(plot.vertices).toHaveLength(3);
  });

  it('adds the plots that only exist on the device, as active and still without a code', () => {
    const plots = mergeKnownPlots(
      [buildPlot({ id: 's1', code: 'P01' })],
      [queued()],
    );

    expect(
      plots.map((plot) => [plot.code, plot.name, plot.queue?.status]),
    ).toEqual([
      ['P01', null, undefined],
      [undefined, 'La loma', 'pending'],
    ]);
    expect(plots[1].isActive).toBe(true);
  });

  it('orders by code as numbers, and leaves the ones without a code last', () => {
    const plots = mergeKnownPlots(
      [
        buildPlot({ id: 'a', code: 'P10' }),
        buildPlot({ id: 'b', code: 'P02' }),
      ],
      [
        queued({
          id: 'c',
          values: { name: '', area_hectares: '1', vertices: [] },
        }),
      ],
    );

    expect(plots.map((plot) => plot.id)).toEqual(['b', 'a', 'c']);
  });

  it('lets a pending edit replace the server copy but keeps its server status', () => {
    const [plot] = mergeKnownPlots(
      [buildPlot({ id: 's1', code: 'P01', is_active: false })],
      [
        queued({
          id: 's1',
          operation: 'update',
          values: { name: 'Lote editado', area_hectares: '3.00', vertices: [] },
        }),
      ],
    );

    expect(plot).toMatchObject({
      id: 's1',
      code: 'P01',
      name: 'Lote editado',
      areaHectares: '3.00',
      isActive: false,
      version: 1,
      queue: { status: 'pending', operation: 'update' },
    });
  });

  it('carries the error of a queued plot so it can be shown and corrected', () => {
    const [plot] = mergeKnownPlots(
      [],
      [
        queued({
          status: 'error',
          errorMessage: 'Se superpone.',
          errorCode: 'plot_overlap',
        }),
      ],
    );

    expect(plot.queue).toMatchObject({
      status: 'error',
      errorMessage: 'Se superpone.',
      errorCode: 'plot_overlap',
    });
  });

  it('orders by code without regard to case or accents', () => {
    const plots = mergeKnownPlots(
      [buildPlot({ id: 'a', code: 'b' }), buildPlot({ id: 'b', code: 'Á' })],
      [],
    );

    expect(plots.map((plot) => plot.code)).toEqual(['Á', 'b']);
  });
});
