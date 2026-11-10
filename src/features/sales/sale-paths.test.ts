import { describe, expect, it } from 'vitest';

import { newSalePath, saleDetailPath } from './sale-paths';

describe('sale paths', () => {
  it('opens the form on a farm only when one is given', () => {
    expect(newSalePath()).toBe('/ventas/registrar');
    expect(newSalePath(null)).toBe('/ventas/registrar');
    expect(newSalePath('f1')).toBe('/ventas/registrar?finca=f1');
  });

  it('opens the detail of a sale on the fixed route', () => {
    expect(saleDetailPath('s1')).toBe('/ventas/detalle?id=s1');
  });
});
