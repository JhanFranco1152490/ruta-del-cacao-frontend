import { describe, expect, it } from 'vitest';

import { currentStateText } from './current-state-text';

describe('currentStateText', () => {
  it('says what is left and what was sold of a lot in the warehouse', () => {
    expect(
      currentStateText({
        status: 'in_warehouse',
        g1_available_kg: '12.5',
        g2_available_kg: '7.5',
        sold_kg: '20.0',
      }),
    ).toBe(
      'Estado actual: En bodega · 12,5 kg de G1 y 7,5 kg de G2 disponibles · 20,0 kg vendidos',
    );
  });

  it('does not mention sales when nothing was sold', () => {
    expect(
      currentStateText({
        status: 'in_warehouse',
        g1_available_kg: '32.5',
        g2_available_kg: '8.0',
        sold_kg: '0.0',
      }),
    ).toBe(
      'Estado actual: En bodega · 32,5 kg de G1 y 8,0 kg de G2 disponibles',
    );
  });

  it('says a lot sold out has nothing left', () => {
    expect(
      currentStateText({
        status: 'in_warehouse',
        g1_available_kg: '0.0',
        g2_available_kg: '0.0',
        sold_kg: '40.5',
      }),
    ).toBe(
      'Estado actual: En bodega · sin cacao disponible · 40,5 kg vendidos',
    );
  });

  it('says only the stage of a lot still in process', () => {
    expect(
      currentStateText({
        status: 'fermenting',
        g1_available_kg: null,
        g2_available_kg: null,
        sold_kg: null,
      }),
    ).toBe('Estado actual: En fermentación');
  });

  it('says a discarded lot is discarded', () => {
    expect(
      currentStateText({
        status: 'discarded',
        g1_available_kg: null,
        g2_available_kg: null,
        sold_kg: null,
      }),
    ).toBe('Estado actual: Descartado');
  });
});
