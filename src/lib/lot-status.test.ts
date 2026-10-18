import { describe, expect, it } from 'vitest';

import { LOT_STATUS_ORDER, lotStatusLabel } from './lot-status';

describe('lot-status', () => {
  it('follows the order of the lot chain', () => {
    expect(LOT_STATUS_ORDER.map(lotStatusLabel)).toEqual([
      'Generado',
      'En fermentación',
      'Fermentado',
      'En secado',
      'Seco',
    ]);
  });
});
