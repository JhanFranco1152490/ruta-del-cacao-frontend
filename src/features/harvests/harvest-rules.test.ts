import { describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';

import {
  canHarvest,
  createHarvestSchema,
  MAX_KG_PER_HECTARE,
  varietiesOfPlot,
  varietyLabel,
  weightLimitKg,
} from './harvest-rules';

type Planting = components['schemas']['Planting'];

const planting = (
  variety: string,
  planting_date: string,
  stage: Planting['stage'] = 'full_production',
): Planting => ({
  variety: { id: variety, name: variety.toUpperCase(), is_active: true },
  planting_date,
  tree_count: 100,
  propagation: 'grafted',
  stage,
});

describe('varietiesOfPlot', () => {
  it('lists each variety once, by name, with the years of its plantings', () => {
    const varieties = varietiesOfPlot([
      planting('ics-95', '2021-03'),
      planting('ccn-51', '2021-06'),
      planting('ccn-51', '2019-02'),
    ]);

    expect(varieties.map(({ id, years }) => [id, years])).toEqual([
      ['ccn-51', ['2019', '2021']],
      ['ics-95', ['2021']],
    ]);
  });

  it('keeps the oldest planting of each variety as the first day a harvest can have', () => {
    const [ccn] = varietiesOfPlot([
      planting('ccn-51', '2021-06'),
      planting('ccn-51', '2019-02'),
    ]);

    expect(ccn.earliestDate).toBe('2019-02-01');
    expect(ccn.earliestMonth).toBe('2019-02');
  });

  it('says when every planting of a variety is still in establishment', () => {
    const varieties = varietiesOfPlot([
      planting('ccn-51', '2025-01', 'establishment'),
      planting('ics-95', '2025-01', 'establishment'),
      planting('ics-95', '2018-01', 'full_production'),
    ]);

    expect(
      varieties.map(({ id, onlyEstablishment }) => [id, onlyEstablishment]),
    ).toEqual([
      ['ccn-51', true],
      ['ics-95', false],
    ]);
  });
});

describe('varietyLabel', () => {
  it('names the variety with the year of its plantings', () => {
    const [one, two] = varietiesOfPlot([
      planting('ccn-51', '2019-02'),
      planting('ics-95', '2019-02'),
      planting('ics-95', '2021-02'),
    ]);

    expect(varietyLabel(one)).toBe('CCN-51 · siembra de 2019');
    expect(varietyLabel(two)).toBe('ICS-95 · siembras de 2019 y 2021');
  });
});

describe('canHarvest', () => {
  it('needs a characterization with plantings', () => {
    expect(canHarvest(undefined)).toBe(false);
    expect(canHarvest({ plantings: [] })).toBe(false);
    expect(canHarvest({ plantings: [planting('ccn-51', '2019-02')] })).toBe(
      true,
    );
  });
});

describe('weightLimitKg', () => {
  it('allows 2.000 kg of wet beans per declared hectare', () => {
    expect(MAX_KG_PER_HECTARE).toBe(2000);
    expect(weightLimitKg('2.40')).toBe(4800);
    expect(weightLimitKg('0.05')).toBe(100);
  });
});

describe('createHarvestSchema', () => {
  const varieties = varietiesOfPlot([
    planting('ccn-51', '2019-02'),
    planting('ics-95', '2021-03'),
  ]);
  const schema = createHarvestSchema({
    today: '2026-10-14',
    areaHectares: '2.40',
    varieties,
  });
  const valid = {
    plot_id: 'pl1',
    harvest_date: '2026-10-14',
    green_weight_kg: '120,5',
    variety_id: 'ccn-51',
    collector_id: 'c1',
  };
  const messagesOf = (values: Partial<typeof valid>) =>
    schema
      .safeParse({ ...valid, ...values })
      .error?.issues.map(({ path, message }) => [path[0], message]);

  it('accepts a harvest and writes the weight as the API wants it', () => {
    expect(schema.parse(valid)).toEqual({ ...valid, green_weight_kg: '120.5' });
  });

  it('marks each missing field', () => {
    expect(
      messagesOf({
        plot_id: '',
        harvest_date: '',
        green_weight_kg: '',
        variety_id: '',
        collector_id: '',
      }),
    ).toEqual([
      ['plot_id', 'Campo obligatorio'],
      ['harvest_date', 'Campo obligatorio'],
      ['green_weight_kg', 'Campo obligatorio'],
      ['variety_id', 'Campo obligatorio'],
      ['collector_id', 'Campo obligatorio'],
    ]);
  });

  it('wants a weight above zero, with at most one decimal', () => {
    expect(messagesOf({ green_weight_kg: '0' })).toEqual([
      ['green_weight_kg', 'El peso debe ser mayor a 0'],
    ]);
    expect(messagesOf({ green_weight_kg: '-3' })).toEqual([
      ['green_weight_kg', 'El peso debe ser mayor a 0'],
    ]);
    expect(messagesOf({ green_weight_kg: '12.25' })).toEqual([
      ['green_weight_kg', 'Usa máximo 1 decimal.'],
    ]);
    expect(messagesOf({ green_weight_kg: 'mucho' })).toEqual([
      ['green_weight_kg', 'Escribe un peso válido.'],
    ]);
  });

  it('stops a weight beyond what the plot can give in one harvest', () => {
    expect(messagesOf({ green_weight_kg: '4800' })).toBeUndefined();
    expect(messagesOf({ green_weight_kg: '4800.1' })).toEqual([
      [
        'green_weight_kg',
        'El peso supera lo que puede dar una parcela de 2,4 ha en una recolección (4800 kg). Revisa la cifra.',
      ],
    ]);
  });

  it('does not take a future date', () => {
    expect(messagesOf({ harvest_date: '2026-10-15' })).toEqual([
      ['harvest_date', 'La fecha no puede ser futura'],
    ]);
  });

  it('does not take a date before the variety was planted in the plot', () => {
    expect(
      messagesOf({ harvest_date: '2021-02-28', variety_id: 'ics-95' }),
    ).toEqual([
      [
        'harvest_date',
        'La fecha es anterior a la siembra de ICS-95 en esta parcela (marzo de 2021)',
      ],
    ]);
    expect(
      messagesOf({ harvest_date: '2021-03-01', variety_id: 'ics-95' }),
    ).toBeUndefined();
  });

  it('only takes a variety of the plantings of the plot', () => {
    expect(messagesOf({ variety_id: 'otra' })).toEqual([
      ['variety_id', 'Elige una variedad de las siembras de la parcela.'],
    ]);
  });
});
