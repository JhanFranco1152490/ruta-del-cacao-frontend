import { describe, expect, it } from 'vitest';

import { onlyFarmOf } from './farm-scope';

const esperanza = { id: 'farm-a', name: 'La Esperanza', is_active: true };
const recreo = { id: 'farm-b', name: 'El Recreo', is_active: true };

describe('onlyFarmOf', () => {
  it('es la finca de quien trabaja en una sola', () => {
    expect(
      onlyFarmOf({ producer_id: 'p1', all_farms: false, farms: [esperanza] }),
    ).toBe(esperanza);
  });

  it('no fija nada a quien alcanza todas o atiende varias', () => {
    expect(
      onlyFarmOf({ producer_id: 'p1', all_farms: true, farms: [] }),
    ).toBeNull();
    expect(
      onlyFarmOf({
        producer_id: 'p1',
        all_farms: false,
        farms: [esperanza, recreo],
      }),
    ).toBeNull();
    expect(
      onlyFarmOf({ producer_id: 'p1', all_farms: false, farms: [] }),
    ).toBeNull();
    expect(onlyFarmOf(undefined)).toBeNull();
  });
});
