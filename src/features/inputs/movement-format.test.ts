import { describe, expect, it } from 'vitest';

import { buildInputMovement } from '@/test/factories';

import { describeMovementAmount } from './movement-format';

describe('describeMovementAmount', () => {
  it('shows an entry with a plus sign', () => {
    expect(
      describeMovementAmount(buildInputMovement({ quantity: '300.000' }), 'ml'),
    ).toBe('+300 mL');
  });

  it('shows a consumption with a minus sign', () => {
    expect(
      describeMovementAmount(
        buildInputMovement({ kind: 'consumption', quantity: '-50.000' }),
        'ml',
      ),
    ).toBe('−50 mL');
  });

  it('shows what was counted and the difference it left', () => {
    expect(
      describeMovementAmount(
        buildInputMovement({
          kind: 'count',
          quantity: '-20.000',
          counted_quantity: '230.000',
        }),
        'ml',
      ),
    ).toBe('Conteo: 230 mL (−20 mL)');
    expect(
      describeMovementAmount(
        buildInputMovement({
          kind: 'count',
          quantity: '5.000',
          counted_quantity: '5.000',
        }),
        'unit',
      ),
    ).toBe('Conteo: 5 unidades (+5 unidades)');
  });

  it('says when a count did not change the stock', () => {
    expect(
      describeMovementAmount(
        buildInputMovement({
          kind: 'count',
          quantity: '0.000',
          counted_quantity: '12.000',
        }),
        'kg',
      ),
    ).toBe('Conteo: 12 kg (sin diferencia)');
  });
});
