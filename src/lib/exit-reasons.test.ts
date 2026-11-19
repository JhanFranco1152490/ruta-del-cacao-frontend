import { describe, expect, it } from 'vitest';

import { exitReasonText } from './exit-reasons';

describe('exitReasonText', () => {
  it('reads the reason, and with Otro what was written', () => {
    expect(exitReasonText('sample')).toBe('Muestra');
    expect(exitReasonText('sale')).toBe('Venta');
    expect(exitReasonText('other', 'Regalo a un cliente')).toBe(
      'Regalo a un cliente',
    );
    expect(exitReasonText('other')).toBe('Otro');
  });
});
