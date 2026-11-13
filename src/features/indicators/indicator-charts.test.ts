import { describe, expect, it } from 'vitest';

import {
  buildAssociationIndicators,
  buildProducerIndicators,
} from '@/test/factories';

import {
  associationFarmBars,
  farmStockBars,
  hasAssociationFigures,
  hasProducerFigures,
  monthGroups,
  plotBars,
  qualitySegments,
  stockBars,
} from './indicator-charts';

const PRODUCER = buildProducerIndicators();
const ASSOCIATION = buildAssociationIndicators();

describe('plotBars', () => {
  it('pone una barra por parcela con sus kilos y su rendimiento por hectárea', () => {
    const [river] = plotBars(PRODUCER.production.plots, 'green');

    expect(river).toMatchObject({
      label: 'F01 · P01 · Lote del río',
      value: 620,
      valueLabel: '620 kg',
      detail: '248 kg/ha · 2,5 ha',
    });
  });

  it('cambia de kilos en baba a secos', () => {
    const [river] = plotBars(PRODUCER.production.plots, 'dry');

    expect(river).toMatchObject({ value: 136, detail: '54,4 kg/ha · 2,5 ha' });
  });

  it('dice cuando una parcela está inactiva y nombra la que no tiene nombre por su código', () => {
    const [, inactive] = plotBars(PRODUCER.production.plots, 'green');

    expect(inactive.label).toBe('F02 · P01');
    expect(inactive.detail).toContain('Parcela inactiva');
  });

  it('un rendimiento sin área es una raya, no cero', () => {
    const [row] = plotBars(
      [{ ...PRODUCER.production.plots[0], green_kg_per_hectare: null }],
      'green',
    );

    expect(row.detail).toMatch(/^— · /);
  });
});

describe('monthGroups', () => {
  it('da un grupo por mes con los kilos como número y el año en el primero', () => {
    const groups = monthGroups(PRODUCER.production.months, [
      'green_kg',
      'dry_kg',
    ]);

    expect(groups.map(({ tick }) => tick)).toEqual(['ene 26', 'feb', 'mar']);
    expect(groups[0]).toMatchObject({
      key: '2026-01',
      title: 'enero de 2026',
      values: { green_kg: 400, dry_kg: 136 },
    });
  });
});

describe('qualitySegments', () => {
  it('reparte G1, G2 y descarte con su porcentaje y sus kilos', () => {
    const segments = qualitySegments(PRODUCER.quality);

    expect(
      segments.map(({ label, percentLabel, valueLabel }) => [
        label,
        percentLabel,
        valueLabel,
      ]),
    ).toEqual([
      ['G1', '76,3 %', '290 kg'],
      ['G2', '18,4 %', '70 kg'],
      ['Descarte', '5,3 %', '20 kg'],
    ]);
  });

  it('sin nada clasificado no hay porcentaje', () => {
    const segments = qualitySegments({
      ...PRODUCER.quality,
      classified_kg: '0.0',
      g1_pct: null,
      g2_pct: null,
      discard_pct: null,
    });

    expect(segments.map(({ percent }) => percent)).toEqual([null, null, null]);
    expect(segments[0].percentLabel).toBe('—');
  });
});

describe('existencias', () => {
  it('dibuja los dos calibres', () => {
    expect(
      stockBars(PRODUCER.inventory).map(({ label, value }) => [label, value]),
    ).toEqual([
      ['G1', 120],
      ['G2', 35],
    ]);
  });

  it('suma los calibres de cada finca y deja el reparto debajo', () => {
    const [farm] = farmStockBars(PRODUCER.inventory.farms);

    expect(farm).toMatchObject({
      label: 'F01 · La Esperanza',
      value: 155,
      valueLabel: '155 kg',
      detail: 'G1 120 kg · G2 35 kg',
    });
  });
});

describe('associationFarmBars', () => {
  it('nombra la finca, su productor y su municipio, y mide lo elegido', () => {
    const rows = associationFarmBars(
      ASSOCIATION.farms,
      'sold',
      (code) => `Municipio ${code}`,
    );

    expect(rows[0]).toMatchObject({
      label: 'F01 · La Esperanza',
      value: 210,
      detail: 'Ana Ejemplo · Municipio 54001',
    });
    expect(rows[1].value).toBe(50);
  });
});

describe('hay cifras', () => {
  it('un panel del productor sin parcelas ni kilos está vacío', () => {
    const empty = buildProducerIndicators({
      production: {
        ...PRODUCER.production,
        green_kg: '0.0',
        plots: [],
      },
      quality: { ...PRODUCER.quality, classified_kg: '0.0' },
      inventory: { ...PRODUCER.inventory, total_kg: '0.0' },
      sales: { ...PRODUCER.sales, sold_kg: '0.0' },
    });

    expect(hasProducerFigures(empty)).toBe(false);
    expect(hasProducerFigures(PRODUCER)).toBe(true);
  });

  it('el de la asociación lo está si ninguna finca tiene cifras', () => {
    expect(
      hasAssociationFigures(buildAssociationIndicators({ farms: [] })),
    ).toBe(false);
    expect(hasAssociationFigures(ASSOCIATION)).toBe(true);
  });
});
