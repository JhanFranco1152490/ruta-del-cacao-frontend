import { describe, expect, it } from 'vitest';

import { LOT_STATUS_ORDER, lotStatusLabel } from './lot-status';

describe('lot-status', () => {
  it('follows the order of the lot chain, without the discard that branches off it', () => {
    expect(LOT_STATUS_ORDER.map(lotStatusLabel)).toEqual([
      'Generado',
      'En fermentación',
      'Fermentado',
      'En secado',
      'Seco',
      'Evaluado',
      'Clasificado',
    ]);
  });

  it('names the discarded lot too', () => {
    expect(lotStatusLabel('discarded')).toBe('Descartado');
  });
});
