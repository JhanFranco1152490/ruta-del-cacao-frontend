import { describe, expect, it } from 'vitest';

import { buildReportTotal } from '@/test/factories';

import { totalItems } from './report-total-items';

describe('totalItems', () => {
  it('writes each total with its unit', () => {
    expect(
      totalItems([
        buildReportTotal({
          key: 'harvests',
          label: 'Cosechas',
          kind: 'count',
          value: 18,
        }),
        buildReportTotal({
          key: 'green_kg',
          label: 'Kg en baba',
          value: '1250.0',
        }),
        buildReportTotal({
          key: 'total_value',
          label: 'Valor total',
          kind: 'money',
          value: 2775000,
        }),
      ]),
    ).toEqual([
      { key: 'harvests', title: 'Cosechas', value: '18', detail: undefined },
      {
        key: 'green_kg',
        title: 'Kg en baba',
        value: '1250,0 kg',
        detail: undefined,
      },
      {
        key: 'total_value',
        title: 'Valor total',
        value: '$ 2.775.000',
        detail: undefined,
      },
    ]);
  });

  // La calidad trae los kilos y el porcentaje de cada calibre.
  it('puts each share under its kilos instead of beside them', () => {
    const items = totalItems([
      buildReportTotal({ key: 'g1_kg', label: 'Kg G1', value: '350.0' }),
      buildReportTotal({ key: 'g2_kg', label: 'Kg G2', value: '100.0' }),
      buildReportTotal({
        key: 'g1_pct',
        label: '% G1',
        kind: 'pct',
        value: '72.9',
      }),
      buildReportTotal({
        key: 'g2_pct',
        label: '% G2',
        kind: 'pct',
        value: '20.8',
      }),
    ]);

    expect(items).toEqual([
      { key: 'g1_kg', title: 'Kg G1', value: '350,0 kg', detail: '72,9 %' },
      { key: 'g2_kg', title: 'Kg G2', value: '100,0 kg', detail: '20,8 %' },
    ]);
  });

  // Sin nada clasificado no hay porcentaje: «sin datos» no es «0 %».
  it('keeps a share without its kilos, and a missing share as a dash', () => {
    const items = totalItems([
      buildReportTotal({ key: 'g1_kg', label: 'Kg G1', value: '0.0' }),
      buildReportTotal({
        key: 'g1_pct',
        label: '% G1',
        kind: 'pct',
        value: null,
      }),
      buildReportTotal({
        key: 'yield_pct',
        label: 'Rendimiento %',
        kind: 'pct',
        value: '33.8',
      }),
    ]);

    expect(items.map(({ value, detail }) => [value, detail])).toEqual([
      ['0,0 kg', '—'],
      ['33,8 %', undefined],
    ]);
  });
});
