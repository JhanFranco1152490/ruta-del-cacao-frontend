import { describe, expect, it } from 'vitest';

import { voidedText } from './voided';

describe('voidedText', () => {
  it('says nothing of what was not voided', () => {
    expect(voidedText({ voided_at: null, void_reason: null })).toBeNull();
  });

  it('says when, by whom and why an exit was voided', () => {
    expect(
      voidedText({
        voided_at: '2026-04-22T10:00:00-05:00',
        void_reason: 'Error al digitar',
        voided_by: 'Bodeguero de prueba',
      }),
    ).toBe(
      'Anulada el 22 de abril de 2026 por Bodeguero de prueba: Error al digitar',
    );
  });

  it('says the day in Bogotá, not in UTC', () => {
    expect(
      voidedText({
        voided_at: '2026-04-23T03:00:00Z',
        void_reason: 'Venta repetida',
      }),
    ).toBe('Anulada el 22 de abril de 2026: Venta repetida');
  });
});
