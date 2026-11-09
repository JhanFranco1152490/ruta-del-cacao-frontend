import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type Warehouse = Schemas['Warehouse'];
export type WarehousePage = Schemas['PaginatedWarehouseList'];
export type WarehouseInput = Schemas['WarehouseCreateRequest'];
export type WarehouseUpdate = Schemas['PatchedWarehouseUpdateRequest'];
export type WarehouseConflictError = Schemas['WarehouseConflictError'];

export type Grade = Schemas['StockGradeEnum'];
export type ExitReason = Schemas['StockExitReasonEnum'];
export type StockRow = Schemas['StockRow'];
export type StockPage = Schemas['PaginatedStockRowList'];
export type StockSummary = Schemas['StockSummary'];
export type PendingEntry = Schemas['PendingEntry'];
export type PendingEntryPage = Schemas['PaginatedPendingEntryList'];
export type StockEntry = Schemas['StockEntry'];
export type StockBalance = Schemas['StockBalance'];
export type StockPerson = Schemas['StockPerson'];
// Lo que la ficha de cualquier lote trae de su bodega, sin quién ingresó ni las salidas.
export type LotWarehouseDetail = Schemas['LotWarehouseDetail'];

// El esquema no describe la anulación (sale como un objeto cualquiera): se le da aquí su forma.
export type StockExitVoid = {
  voided_at: string;
  voided_by: StockPerson;
  reason: string;
};
export type StockExit = Omit<Schemas['StockExit'], 'voided'> & {
  voided: StockExitVoid | null;
};
export type LotStock = Omit<Schemas['LotStock'], 'exits'> & {
  exits: StockExit[];
};

export type StockMove = Schemas['StockMove'];
export type StockExitRow = Omit<Schemas['StockExitRow'], 'voided'> & {
  voided: StockExitVoid | null;
};
export type StockExitPage = Omit<
  Schemas['PaginatedStockExitRowList'],
  'results'
> & { results: StockExitRow[] };
export type ExitSummary = Schemas['ExitSummary'];
export type MoveInput = Schemas['MoveCreateRequest'];

export type EntryInput = Schemas['EntryCreateRequest'];
export type EntryCorrection = Schemas['PatchedEntryUpdateRequest'];
export type ExitInput = Schemas['ExitCreateRequest'];
export type ExitVoidInput = Schemas['ExitVoidRequest'];
export type StockConflictError = Schemas['StockConflictError'];
export type StockInsufficientError = Schemas['StockInsufficientError'];

export const WAREHOUSE_ERROR = {
  nameTaken: 'warehouse_name_taken',
  hasRecords: 'warehouse_has_records',
  farmMismatch: 'warehouse_farm_mismatch',
  inactive: 'warehouse_inactive',
  farmInactive: 'farm_inactive',
  lotInvalidStatus: 'lot_invalid_status',
  nothingToStore: 'lot_nothing_to_store',
  entryHasMovements: 'entry_has_movements',
  stockInsufficient: 'stock_insufficient',
  exitAlreadyVoided: 'exit_already_voided',
  exitNotVoidable: 'exit_not_voidable',
  withoutStock: 'lot_without_stock',
  moveUnchanged: 'stock_move_unchanged',
  staleVersion: 'stale_version',
} as const;
