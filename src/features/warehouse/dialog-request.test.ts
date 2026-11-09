import { describe, expect, it } from 'vitest';

import {
  buildLotStock,
  buildStockEntry,
  buildStockExit,
} from '@/test/factories';

import {
  ENTRY_MOVED_MESSAGE,
  EXIT_GONE_MESSAGE,
  NO_PERMISSION_MESSAGE,
  NO_STOCK_MESSAGE,
  requestOutcome,
} from './dialog-request';
import type { WarehousePermissions } from './warehouse-actions';

const ALL: WarehousePermissions = {
  view: true,
  entry: true,
  exit: true,
  manage: true,
  viewLot: true,
};

const CLASSIFIED = buildLotStock();
const IN_WAREHOUSE = buildLotStock({
  lot: { ...CLASSIFIED.lot, status: 'in_warehouse', version: 11 },
  entry: buildStockEntry(),
  balances: [{ grade: 'g1', quantity_kg: '250.0' }],
  exits: [buildStockExit()],
});

describe('requestOutcome', () => {
  it('opens the entry of a classified lot', () => {
    expect(
      requestOutcome(CLASSIFIED, { action: 'ingresar', lotId: 'l1' }, ALL),
    ).toEqual({ open: true });
  });

  it('says the lot moved on when someone stored it meanwhile', () => {
    expect(
      requestOutcome(IN_WAREHOUSE, { action: 'ingresar', lotId: 'l1' }, ALL),
    ).toEqual({ open: false, message: 'El lote ya está en bodega.' });
  });

  it('moves the cacao of a lot in the warehouse, at any time and only with kilos', () => {
    const request = { action: 'mover', lotId: 'l1' } as const;
    expect(requestOutcome(IN_WAREHOUSE, request, ALL)).toEqual({ open: true });
    expect(
      requestOutcome(
        { ...IN_WAREHOUSE, balances: [{ grade: 'g1', quantity_kg: '0.0' }] },
        request,
        ALL,
      ),
    ).toEqual({ open: false, message: NO_STOCK_MESSAGE });
    expect(requestOutcome(CLASSIFIED, request, ALL)).toEqual({
      open: false,
      message: 'El lote ya está clasificado.',
    });
    expect(
      requestOutcome(IN_WAREHOUSE, request, { ...ALL, entry: false }),
    ).toEqual({
      open: false,
      message: NO_PERMISSION_MESSAGE,
    });
  });

  it('corrects the entry only while nothing left', () => {
    const request = { action: 'corregir', lotId: 'l1' } as const;
    expect(requestOutcome(IN_WAREHOUSE, request, ALL)).toEqual({ open: true });
    expect(
      requestOutcome(
        { ...IN_WAREHOUSE, entry: buildStockEntry({ can_correct: false }) },
        request,
        ALL,
      ),
    ).toEqual({ open: false, message: ENTRY_MOVED_MESSAGE });
  });

  it('takes out only of a lot that still has stock', () => {
    const request = { action: 'salida', lotId: 'l1' } as const;
    expect(requestOutcome(IN_WAREHOUSE, request, ALL)).toEqual({ open: true });
    expect(
      requestOutcome(
        { ...IN_WAREHOUSE, balances: [{ grade: 'g1', quantity_kg: '0.0' }] },
        request,
        ALL,
      ),
    ).toEqual({ open: false, message: NO_STOCK_MESSAGE });
  });

  it('voids only an exit that can still be voided', () => {
    expect(
      requestOutcome(
        IN_WAREHOUSE,
        { action: 'anular', lotId: 'l1', exitId: 'e1' },
        ALL,
      ),
    ).toEqual({ open: true });
    expect(
      requestOutcome(
        IN_WAREHOUSE,
        { action: 'anular', lotId: 'l1', exitId: 'otra' },
        ALL,
      ),
    ).toEqual({ open: false, message: EXIT_GONE_MESSAGE });
  });

  it('says so when the account lacks the permission', () => {
    expect(
      requestOutcome(
        CLASSIFIED,
        { action: 'ingresar', lotId: 'l1' },
        { ...ALL, entry: false },
      ),
    ).toEqual({ open: false, message: NO_PERMISSION_MESSAGE });
  });
});
