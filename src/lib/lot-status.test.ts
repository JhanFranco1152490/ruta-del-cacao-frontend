import { describe, expect, it } from 'vitest';

import { LOT_STATUS_ORDER, lotStatusLabel } from './lot-status';

describe('lot-status', () => {
  it('sigue el orden de la cadena del lote', () => {
    expect(LOT_STATUS_ORDER.map(lotStatusLabel)).toEqual([
      'Generado',
      'En fermentación',
      'Fermentado',
      'En secado',
      'Seco',
    ]);
  });
});
