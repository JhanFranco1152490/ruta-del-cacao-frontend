import { describe, expect, it } from 'vitest';

import { buildPlot, buildVertex } from '@/test/factories';

import { plotsToShapes } from './plot-map';

const BOUNDARY = [
  buildVertex('-72.5000000', '7.8000000'),
  buildVertex('-72.4990000', '7.8000000'),
  buildVertex('-72.4990000', '7.8010000'),
];

describe('plotsToShapes', () => {
  it('draws only the plots that have a boundary', () => {
    const shapes = plotsToShapes([
      buildPlot({ id: 'a', code: 'P1', boundary: BOUNDARY }),
      buildPlot({ id: 'b', code: 'P2', boundary: null }),
    ]);

    expect(shapes.map((shape) => shape.id)).toEqual(['a']);
  });

  it('labels the shape with the plot code and turns coordinates into numbers', () => {
    const [shape] = plotsToShapes([
      buildPlot({ code: 'P1 · El Mango', boundary: BOUNDARY }),
    ]);

    expect(shape.label).toBe('P1 · El Mango');
    expect(shape.positions[0]).toEqual({ latitude: 7.8, longitude: -72.5 });
    expect(shape.detail).toBe('2,4 ha · Activa');
  });

  it('colors an inactive plot as a warning', () => {
    const [shape] = plotsToShapes([
      buildPlot({ boundary: BOUNDARY, is_active: false }),
    ]);

    expect(shape.tone).toBe('warn');
    expect(shape.detail).toContain('Inactiva');
  });
});
