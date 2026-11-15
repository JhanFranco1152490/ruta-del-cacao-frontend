import { describe, expect, it } from 'vitest';

import { buildProducerIndicators } from '@/test/factories';

import { plotRows } from './plot-rows';

const [river, other] = buildProducerIndicators().production.plots;
const make = (id: string, kg: string, perHectare: string | null) => ({
  ...river,
  plot_id: id,
  green_kg: kg,
  green_kg_per_hectare: perHectare,
});

describe('plotRows', () => {
  it('ordena de la más a la menos productiva por hectárea y marca los extremos', () => {
    const rows = plotRows(
      [
        make('low', '50.0', '50.0'),
        make('mid', '100.0', '100.0'),
        make('top', '200.0', '200.0'),
      ],
      '100.0',
    );

    expect(rows.map(({ plot }) => plot.plot_id)).toEqual(['top', 'mid', 'low']);
    expect(rows.map(({ versusAverage }) => versusAverage)).toEqual([
      100, 0, -50,
    ]);
    expect(rows.map(({ extreme }) => extreme)).toEqual([
      'best',
      null,
      'lowest',
    ]);
  });

  it('una parcela sin cosecha no se compara y queda al final', () => {
    const rows = plotRows(
      [
        make('none', '0.0', '0.0'),
        make('top', '200.0', '200.0'),
        make('mid', '100.0', '100.0'),
      ],
      '100.0',
    );

    expect(rows.map(({ plot }) => plot.plot_id)).toEqual([
      'top',
      'mid',
      'none',
    ]);
    expect(rows[2]).toMatchObject({ versusAverage: null, extreme: null });
  });

  it('sin área no hay con qué comparar', () => {
    const [row] = plotRows([{ ...other, green_kg_per_hectare: null }], '100.0');

    expect(row.versusAverage).toBeNull();
  });

  it('con una sola comparable no marca mejor ni más baja', () => {
    const [row] = plotRows([make('only', '100.0', '100.0')], '100.0');

    expect(row.extreme).toBeNull();
  });
});
