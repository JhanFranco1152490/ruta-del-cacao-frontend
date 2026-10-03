import { describe, expect, it } from 'vitest';

import type { KnownPlot } from './known-plots';
import { plotsToShapes } from './plot-map';
import type { DraftVertex } from './plot-vertices';

const vertex = (latitude: number, longitude: number): DraftVertex => ({
  latitude,
  longitude,
  source: 'map',
  accuracyM: null,
  capturedAt: null,
});

const BOUNDARY = [
  vertex(7.8, -72.5),
  vertex(7.8, -72.499),
  vertex(7.801, -72.499),
];

const plot = (over: Partial<KnownPlot> = {}): KnownPlot => ({
  id: 'pl1',
  code: 'P1',
  areaHectares: '2.40',
  isActive: true,
  vertices: BOUNDARY,
  ...over,
});

describe('plotsToShapes', () => {
  it('draws only the plots that have a polygon', () => {
    const shapes = plotsToShapes([
      plot({ id: 'a' }),
      plot({ id: 'b', vertices: [] }),
    ]);

    expect(shapes.map((shape) => shape.id)).toEqual(['a']);
  });

  it('labels the shape with the plot code and keeps the coordinates as numbers', () => {
    const [shape] = plotsToShapes([plot({ code: 'P1 · El Mango' })]);

    expect(shape.label).toBe('P1 · El Mango');
    expect(shape.positions[0]).toEqual({ latitude: 7.8, longitude: -72.5 });
    expect(shape.detail).toBe('2,4 ha · Activa');
  });

  it('colors an inactive plot as a warning', () => {
    const [shape] = plotsToShapes([plot({ isActive: false })]);

    expect(shape.tone).toBe('warn');
    expect(shape.detail).toContain('Inactiva');
  });

  it('colors what is waiting on the device and what failed there', () => {
    const [waiting, failed] = plotsToShapes([
      plot({ queue: { status: 'pending', operation: 'create' } }),
      plot({ id: 'b', queue: { status: 'error', operation: 'create' } }),
    ]);

    expect(waiting.tone).toBe('info');
    expect(failed.tone).toBe('err');
  });
});
