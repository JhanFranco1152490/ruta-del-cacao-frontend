import { describe, expect, it } from 'vitest';

import { buildPlot, buildVertex } from '@/test/factories';

import { mergeKnownPlots } from './known-plots';
import type { QueuedPlot } from './plot-queue';

const queued = (over: Partial<QueuedPlot> = {}): QueuedPlot => ({
  id: 'q1',
  farmId: 'f1',
  operation: 'create',
  status: 'pending',
  values: { code: 'P-nueva', area_hectares: '1.00', vertices: [] },
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

  it('adds the plots that only exist on the device, as active', () => {
    const plots = mergeKnownPlots(
      [buildPlot({ id: 's1', code: 'P1' })],
      [queued()],
    );

    expect(plots.map((plot) => [plot.code, plot.queue?.status])).toEqual([
      ['P-nueva', 'pending'],
      ['P1', undefined],
    ]);
    expect(plots[0].isActive).toBe(true);
  });

  it('lets a pending edit replace the server copy but keeps its server status', () => {
    const [plot] = mergeKnownPlots(
      [buildPlot({ id: 's1', code: 'P1', is_active: false })],
      [
        queued({
          id: 's1',
          operation: 'update',
          values: { code: 'P1 editada', area_hectares: '3.00', vertices: [] },
        }),
      ],
    );

    expect(plot).toMatchObject({
      id: 's1',
      code: 'P1 editada',
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
