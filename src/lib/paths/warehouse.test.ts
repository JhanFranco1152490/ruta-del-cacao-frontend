import { describe, expect, it } from 'vitest';

import { WAREHOUSE_PATH, warehouseActionPath } from './warehouse';

describe('warehouseActionPath', () => {
  it('opens the entry form in the tab of the lots to store', () => {
    expect(warehouseActionPath('l1', 'ingresar')).toBe(
      `${WAREHOUSE_PATH}?vista=por-ingresar&lote=l1&accion=ingresar`,
    );
  });

  it('opens the exit form in the stock tab', () => {
    expect(warehouseActionPath('l1', 'salida')).toBe(
      '/bodega?vista=existencias&lote=l1&accion=salida',
    );
  });

  it('escapes the lot id', () => {
    expect(warehouseActionPath('a b', 'salida')).toBe(
      '/bodega?vista=existencias&lote=a+b&accion=salida',
    );
  });
});
