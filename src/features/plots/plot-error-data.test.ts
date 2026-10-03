import { describe, expect, it } from 'vitest';

import { buildPlot, buildVertex } from '@/test/factories';

import type { KnownPlot } from './known-plots';
import {
  asPlotErrorData,
  overlappedNeighbours,
  withNeighbours,
} from './plot-error-data';

const overlap = {
  plot_id: 'p2',
  code: 'P2',
  overlap_area_hectares: '0.1200',
  boundary: [
    buildVertex('-72.5', '7.8'),
    buildVertex('-72.499', '7.8'),
    buildVertex('-72.499', '7.801'),
  ],
};

describe('plot error data', () => {
  it('reads nothing as an empty set of data', () => {
    expect(asPlotErrorData(undefined)).toEqual({});
    expect(asPlotErrorData('x')).toEqual({});
  });

  it('turns the plots the server said were invaded into neighbours with their polygon', () => {
    const [neighbour] = overlappedNeighbours(
      asPlotErrorData({ overlaps: [overlap] }),
    );

    expect(neighbour).toMatchObject({ id: 'p2', code: 'P2', isActive: true });
    expect(neighbour.vertices).toHaveLength(3);
  });

  it('has no neighbours when the error was not an overlap', () => {
    expect(
      overlappedNeighbours(asPlotErrorData({ current: buildPlot() })),
    ).toEqual([]);
  });

  it('adds only the neighbours the device did not already know', () => {
    const known = [{ id: 'p2', code: 'P2' } as KnownPlot];
    const extra = [
      { id: 'p2', code: 'P2 otra' } as KnownPlot,
      { id: 'p3', code: 'P3' } as KnownPlot,
    ];

    expect(withNeighbours(known, extra).map((plot) => plot.id)).toEqual([
      'p2',
      'p3',
    ]);
  });
});
