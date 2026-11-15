import { describe, expect, it } from 'vitest';

import { buildProducerIndicators } from '@/test/factories';

import { lowestYieldPlot, producerInsights } from './indicator-insights';

const BASE = buildProducerIndicators();
const plot = (overrides: Partial<(typeof BASE.production.plots)[number]>) => ({
  ...BASE.production.plots[0],
  ...overrides,
});
const withPlots = (plots: (typeof BASE.production.plots)[number][]) =>
  buildProducerIndicators({
    production: { ...BASE.production, green_kg_per_hectare: '150.0', plots },
  });

describe('lowestYieldPlot', () => {
  it('señala la parcela que rinde mucho menos que el promedio', () => {
    const production = withPlots([
      plot({ plot_id: 'a', green_kg: '400.0', green_kg_per_hectare: '200.0' }),
      plot({ plot_id: 'b', green_kg: '60.0', green_kg_per_hectare: '60.0' }),
    ]).production;

    const low = lowestYieldPlot(production);

    expect(low?.plot.plot_id).toBe('b');
    expect(low?.belowPercent).toBe(60);
  });

  it('no culpa a una parcela que no cosechó en el periodo', () => {
    const production = withPlots([
      plot({ plot_id: 'a', green_kg: '400.0', green_kg_per_hectare: '200.0' }),
      plot({ plot_id: 'b', green_kg: '0.0', green_kg_per_hectare: '0.0' }),
    ]).production;

    expect(lowestYieldPlot(production)).toBeNull();
  });

  it('calla con una sola parcela o con rendimientos parecidos', () => {
    expect(lowestYieldPlot(withPlots([plot({})]).production)).toBeNull();
    const similar = withPlots([
      plot({ plot_id: 'a', green_kg_per_hectare: '150.0' }),
      plot({ plot_id: 'b', green_kg_per_hectare: '140.0' }),
    ]).production;
    expect(lowestYieldPlot(similar)).toBeNull();
  });
});

describe('producerInsights', () => {
  it('avisa lo cosechado sin secar y el descarte bajo como bueno', () => {
    const insights = producerInsights(BASE);

    expect(insights.map(({ key, tone }) => [key, tone])).toEqual([
      ['not-dried', 'warn'],
      ['discard', 'ok'],
    ]);
    expect(insights[0].text).toBe('220 kg cosechados siguen sin secar.');
  });

  it('avisa un descarte alto como algo que atender', () => {
    const insights = producerInsights(
      buildProducerIndicators({
        quality: { ...BASE.quality, discard_pct: '26.3' },
      }),
    );

    expect(insights.find(({ key }) => key === 'discard')).toMatchObject({
      tone: 'warn',
      text: 'El descarte es de 26,3 % de lo clasificado.',
    });
  });

  it('sin porcentaje de descarte no dice nada de calidad', () => {
    const insights = producerInsights(
      buildProducerIndicators({
        quality: {
          ...BASE.quality,
          classified_kg: '0.0',
          g1_pct: null,
          g2_pct: null,
          discard_pct: null,
        },
      }),
    );

    expect(insights.some(({ key }) => key === 'discard')).toBe(false);
  });

  it('dice cuando lo clasificado ya se vendió', () => {
    const insights = producerInsights(
      buildProducerIndicators({
        inventory: { ...BASE.inventory, total_kg: '0.0' },
      }),
    );

    expect(insights.some(({ key }) => key === 'empty-stock')).toBe(true);
  });

  it('un panel sin novedades no trae frases', () => {
    const quiet = buildProducerIndicators({
      production: { ...BASE.production, green_kg_not_dried: '0.0' },
      quality: { ...BASE.quality, discard_pct: null },
    });

    expect(producerInsights(quiet)).toEqual([]);
  });
});
