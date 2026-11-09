import { describe, expect, it } from 'vitest';

import type { LotStatus } from '@/lib/lot-status';
import { PERMISSIONS } from '@/lib/permissions';

import {
  exitVoidOffer,
  lotStockActions,
  OFFLINE_WAREHOUSE_REASON,
  pendingEntryOffer,
  stockMoveOffer,
  resolveWarehouseView,
  stockExitOffer,
  type WarehousePermissions,
  warehouseItemActions,
  warehousePermissionsOf,
  warehouseViews,
} from './warehouse-actions';

const ALL: WarehousePermissions = {
  view: true,
  entry: true,
  exit: true,
  manage: true,
  viewLot: true,
};
const VIEW_ONLY: WarehousePermissions = {
  view: true,
  entry: false,
  exit: false,
  manage: false,
  viewLot: false,
};

const labels = (offers: { label: string }[]) =>
  offers.map(({ label }) => label);

describe('warehousePermissionsOf', () => {
  it('reads the four warehouse permissions and the lot view', () => {
    expect(
      warehousePermissionsOf({
        permissions: [
          PERMISSIONS.WAREHOUSE_VIEW_STOCK,
          PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
        ],
      }),
    ).toEqual({
      view: true,
      entry: false,
      exit: true,
      manage: false,
      viewLot: false,
    });
  });
});

describe('warehouseViews', () => {
  it('shows the lots to store only to whom can store them', () => {
    expect(warehouseViews(ALL)).toEqual([
      'por-ingresar',
      'existencias',
      'salidas',
      'bodegas',
    ]);
    expect(warehouseViews(VIEW_ONLY)).toEqual([
      'existencias',
      'salidas',
      'bodegas',
    ]);
  });

  it('falls back to the stock when the address asks for a tab not shown', () => {
    expect(resolveWarehouseView('por-ingresar', VIEW_ONLY)).toBe('existencias');
    expect(resolveWarehouseView('bodegas', VIEW_ONLY)).toBe('bodegas');
    expect(resolveWarehouseView(null, ALL)).toBe('existencias');
  });
});

describe('lotStockActions', () => {
  const offered = (
    status: LotStatus,
    {
      canCorrect = true,
      hasStock = true,
      online = true,
      can = ALL,
    }: Partial<{
      canCorrect: boolean;
      hasStock: boolean;
      online: boolean;
      can: WarehousePermissions;
    }> = {},
  ) => lotStockActions({ status, canCorrect, hasStock, online, can });

  it('stores a classified lot', () => {
    expect(labels(offered('classified'))).toEqual(['Ingresar a bodega']);
    expect(offered('classified', { can: VIEW_ONLY })).toEqual([]);
  });

  it('takes out, moves and corrects a lot in the warehouse', () => {
    expect(labels(offered('in_warehouse'))).toEqual([
      'Registrar salida',
      'Mover',
      'Corregir ingreso',
    ]);
  });

  it('does not correct once cacao left, nor take out or move an empty lot', () => {
    expect(labels(offered('in_warehouse', { canCorrect: false }))).toEqual([
      'Registrar salida',
      'Mover',
    ]);
    expect(labels(offered('in_warehouse', { hasStock: false }))).toEqual([
      'Corregir ingreso',
    ]);
  });

  it('moves only with the permission to enter', () => {
    const exitOnly = { ...ALL, entry: false };

    expect(labels(offered('in_warehouse', { can: exitOnly }))).toEqual([
      'Registrar salida',
    ]);
  });

  it('offers nothing before the classification nor to whom only reads', () => {
    expect(offered('evaluated')).toEqual([]);
    expect(offered('discarded')).toEqual([]);
    expect(offered('in_warehouse', { can: VIEW_ONLY })).toEqual([]);
  });

  it('shows the actions offline, disabled with the reason', () => {
    expect(
      offered('in_warehouse', { online: false }).map(
        ({ disabledReason }) => disabledReason,
      ),
    ).toEqual([
      OFFLINE_WAREHOUSE_REASON,
      OFFLINE_WAREHOUSE_REASON,
      OFFLINE_WAREHOUSE_REASON,
    ]);
  });
});

describe('pendingEntryOffer', () => {
  it('offers the entry of a classified lot only with the permission', () => {
    expect(pendingEntryOffer(true, ALL)?.label).toBe('Ingresar a bodega');
    expect(pendingEntryOffer(true, VIEW_ONLY)).toBeNull();
  });
});

describe('stockMoveOffer', () => {
  it('offers moving a stock row only with the permission to enter', () => {
    expect(stockMoveOffer(true, ALL)?.label).toBe('Mover');
    expect(stockMoveOffer(true, { ...ALL, entry: false })).toBeNull();
    expect(stockMoveOffer(false, ALL)?.disabledReason).toBe(
      OFFLINE_WAREHOUSE_REASON,
    );
  });
});

describe('stockExitOffer', () => {
  it('offers the exit of a stock row only with the permission', () => {
    expect(stockExitOffer(true, ALL)?.label).toBe('Registrar salida');
    expect(stockExitOffer(false, ALL)?.disabledReason).toBe(
      OFFLINE_WAREHOUSE_REASON,
    );
    expect(stockExitOffer(true, VIEW_ONLY)).toBeNull();
  });
});

describe('exitVoidOffer', () => {
  it('voids a manual exit still in force, as a danger action', () => {
    expect(exitVoidOffer({ can_void: true }, true, ALL)).toMatchObject({
      label: 'Anular',
      danger: true,
      disabledReason: null,
    });
  });

  it('does not void a sale, a voided exit, or without the permission', () => {
    expect(exitVoidOffer({ can_void: false }, true, ALL)).toBeNull();
    expect(exitVoidOffer({ can_void: true }, true, VIEW_ONLY)).toBeNull();
  });
});

describe('warehouseItemActions', () => {
  it('edits, deactivates and deletes a warehouse never used', () => {
    expect(
      labels(
        warehouseItemActions({ is_active: true, in_use: false }, true, ALL),
      ),
    ).toEqual(['Editar', 'Desactivar', 'Eliminar']);
  });

  it('only deactivates or activates a warehouse that received entries', () => {
    expect(
      labels(
        warehouseItemActions({ is_active: true, in_use: true }, true, ALL),
      ),
    ).toEqual(['Editar', 'Desactivar']);
    expect(
      labels(
        warehouseItemActions({ is_active: false, in_use: true }, true, ALL),
      ),
    ).toEqual(['Editar', 'Activar']);
  });

  it('offers nothing to whom only reads', () => {
    expect(
      warehouseItemActions({ is_active: true, in_use: false }, true, VIEW_ONLY),
    ).toEqual([]);
  });
});
