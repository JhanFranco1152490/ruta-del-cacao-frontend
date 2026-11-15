import { describe, expect, it } from 'vitest';

import { buildAssociationIndicators } from '@/test/factories';

import { farmsByProducer } from './indicator-groups';

const { farms } = buildAssociationIndicators();

describe('farmsByProducer', () => {
  it('suma las fincas de cada productor', () => {
    const second = {
      ...farms[0],
      farm_id: 'f3',
      farm_name: 'El Mirador',
      green_kg: '80.3',
      dry_kg: '10.1',
      sold_kg: '5.0',
      classified_kg: '40.0',
      g1_kg: '30.0',
      g2_kg: '10.0',
      discard_kg: '0.0',
    };

    const rows = farmsByProducer([farms[0], second, farms[1]]);

    expect(rows[0]).toMatchObject({
      name: 'Ana Ejemplo',
      memberCode: 'PROD-000001',
      farms: 2,
      green_kg: '800.3',
      dry_kg: '176.1',
      sold_kg: '215.0',
      classified_kg: '420.0',
      g1_kg: '320.0',
      g1_pct: '76.2',
      discard_pct: '4.8',
    });
  });

  it('va del que más produjo al que menos', () => {
    expect(farmsByProducer(farms).map(({ name }) => name)).toEqual([
      'Ana Ejemplo',
      'Luis Ejemplo',
    ]);
  });

  it('sin nada clasificado el porcentaje es nulo y no 0 %', () => {
    const [row] = farmsByProducer([
      {
        ...farms[0],
        classified_kg: '0.0',
        g1_kg: '0.0',
        g2_kg: '0.0',
        discard_kg: '0.0',
        g1_pct: null,
        g2_pct: null,
        discard_pct: null,
      },
    ]);

    expect(row.g1_pct).toBeNull();
  });

  it('sin fincas no hay filas', () => {
    expect(farmsByProducer([])).toEqual([]);
  });
});
