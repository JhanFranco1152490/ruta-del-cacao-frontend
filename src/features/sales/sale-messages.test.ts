import { describe, expect, it } from 'vitest';

import {
  invoiceNotAttached,
  saleRegistered,
  saleVoided,
  voidConsequence,
  voidQuestion,
} from './sale-messages';

describe('sale messages', () => {
  it('names the sale by its number', () => {
    expect(saleRegistered('V-0012')).toBe('Venta V-0012 registrada.');
    expect(saleVoided('V-0012')).toBe('Venta V-0012 anulada.');
    expect(voidQuestion('V-0012')).toBe('¿Anular la venta V-0012?');
    expect(invoiceNotAttached('V-0012')).toBe(
      'Venta V-0012 registrada, pero no se pudo adjuntar el soporte. Adjúntalo desde la venta.',
    );
  });

  it('says how many kilos go back to the warehouse, with one decimal', () => {
    expect(voidConsequence(190)).toBe(
      'Los 190,0 kg vuelven a las existencias de bodega. La venta queda en el historial como anulada.',
    );
  });
});
