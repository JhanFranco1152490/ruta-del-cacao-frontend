import { describe, expect, it } from 'vitest';

import { warehouseLotActions, warehouseStageAction } from './lot-actions';
import type { WarehousePermissions } from './warehouse-actions';

const ALL: WarehousePermissions = {
  view: true,
  entry: true,
  exit: true,
  manage: true,
  viewLot: true,
};
const VIEW_ONLY: WarehousePermissions = {
  ...ALL,
  entry: false,
  exit: false,
  manage: false,
};

describe('warehouseLotActions', () => {
  it('stores a classified lot, opening its form in Bodega', () => {
    expect(
      warehouseLotActions({ id: 'l1', status: 'classified' }, ALL),
    ).toEqual([
      expect.objectContaining({
        label: 'Ingresar a bodega',
        href: '/bodega?vista=por-ingresar&lote=l1&accion=ingresar',
      }),
    ]);
  });

  it('offers nothing on other statuses nor to whom cannot store', () => {
    expect(
      warehouseLotActions({ id: 'l1', status: 'in_warehouse' }, ALL),
    ).toEqual([]);
    expect(warehouseLotActions({ id: 'l1', status: 'evaluated' }, ALL)).toEqual(
      [],
    );
    expect(
      warehouseLotActions({ id: 'l1', status: 'classified' }, VIEW_ONLY),
    ).toEqual([]);
  });
});

describe('warehouseStageAction', () => {
  it('leads to the tab where each status is worked', () => {
    expect(warehouseStageAction('classified', ALL)?.href).toBe(
      '/bodega?vista=por-ingresar',
    );
    expect(warehouseStageAction('in_warehouse', ALL)?.href).toBe('/bodega');
  });

  it('leads whom only reads to the stock, never to the lots to store', () => {
    expect(warehouseStageAction('classified', VIEW_ONLY)).toBeNull();
    expect(warehouseStageAction('in_warehouse', VIEW_ONLY)?.href).toBe(
      '/bodega',
    );
    expect(warehouseStageAction('dried', ALL)).toBeNull();
  });
});
