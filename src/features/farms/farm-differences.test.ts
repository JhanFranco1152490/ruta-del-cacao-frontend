import { describe, expect, it } from 'vitest';

import { farmDifferences } from './farm-differences';
import type { FarmFormValues } from './schemas';

const base: FarmFormValues = {
  name: 'La Esperanza',
  municipality_id: '54001',
  details: 'Vereda El Pórtico',
  area_hectares: '12.50',
  altitude_masl: '950',
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

describe('farmDifferences', () => {
  it('lists every field that differs, including the ones nobody sees in a short summary', () => {
    const server = { ...base, details: 'Km 4', latitude: '7.9000000' };

    expect(farmDifferences(server, base)).toEqual([
      { field: 'details', server: 'Km 4', mine: 'Vereda El Pórtico' },
      { field: 'latitude', server: '7.9000000', mine: '7.8234567' },
    ]);
  });

  it('treats the same number written differently as the same value', () => {
    const mine = { ...base, area_hectares: '12,5', latitude: '7.8234567000' };

    expect(farmDifferences(base, mine)).toEqual([]);
  });

  it('ignores spaces around text', () => {
    expect(farmDifferences(base, { ...base, name: ' La Esperanza ' })).toEqual(
      [],
    );
  });
});
