import { describe, expect, it } from 'vitest';

import { buildAssociationIndicators } from '@/test/factories';

import {
  farmSources,
  scatterAverages,
  scatterPoints,
  varietySources,
} from './indicator-scatter';

const { farms, varieties, totals } = buildAssociationIndicators();

describe('scatterPoints', () => {
  it('pone cada finca en sus kilos, su % de G1 y lo vendido como tamaño', () => {
    const { points } = scatterPoints(farmSources(farms), 'green', 'g1');

    expect(points[0]).toMatchObject({
      label: 'La Esperanza',
      x: 720,
      y: 76.3,
      size: 210,
    });
  });

  it('cambia los ejes: kilos secos y % de descarte', () => {
    const { points } = scatterPoints(farmSources(farms), 'dry', 'discard');

    expect(points[1]).toMatchObject({ x: 30, y: 10 });
  });

  it('pinta de rojo la fila con 10 % o más de descarte', () => {
    const { points } = scatterPoints(farmSources(farms), 'green', 'g1');

    expect(points[0].color).toBe('var(--hoja)');
    expect(points[1].color).toBe('var(--err)');
  });

  it('una finca sin clasificar no se dibuja y se cuenta aparte', () => {
    const { points, unclassified } = scatterPoints(
      farmSources([
        { ...farms[0], g1_pct: null, g2_pct: null, discard_pct: null },
        farms[1],
      ]),
      'green',
      'g1',
    );

    expect(points).toHaveLength(1);
    expect(unclassified.map(({ label }) => label)).toEqual(['La Esperanza']);
  });

  it('una variedad no tiene ventas: su tamaño es lo clasificado', () => {
    const { points } = scatterPoints(varietySources(varieties), 'green', 'g1');

    expect(points[0]).toMatchObject({ label: 'CCN-51', x: 600, size: 400 });
  });
});

describe('scatterAverages', () => {
  it('promedia los kilos de las filas y toma el % de toda la asociación', () => {
    expect(scatterAverages(farmSources(farms), totals, 'green', 'g2')).toEqual({
      x: 410,
      y: 20.8,
    });
  });

  it('sin filas el promedio de kilos es 0', () => {
    expect(scatterAverages([], totals, 'green', 'g1').x).toBe(0);
  });
});
