import type { Grade, LotStock } from './api';
import { exitableGrades } from './exit-quantity';
import {
  type LotStockAction,
  type WarehousePermissions,
} from './warehouse-actions';
import { lotStatusMessage } from './warehouse-errors';

// El formulario que se pide abrir sobre un lote: desde una fila, una tarjeta, la ficha o un enlace
// de otra pantalla. El diálogo lee el lote completo; la fila de existencias propone además su
// calibre, y anular dice qué salida.
export type DialogRequest =
  | { action: LotStockAction; lotId: string; grade?: Grade }
  | { action: 'anular'; lotId: string; exitId: string };

export const NO_PERMISSION_MESSAGE =
  'Tu cuenta no tiene permiso para hacer esto.';
export const NO_STOCK_MESSAGE = 'Este lote ya no tiene existencias.';
export const ENTRY_MOVED_MESSAGE =
  'Ya salió cacao de este lote: el ingreso no se puede corregir.';
export const EXIT_GONE_MESSAGE = 'Esa salida ya no se puede anular.';

const allowedBy = (
  action: DialogRequest['action'],
  can: WarehousePermissions,
) => (action === 'ingresar' || action === 'corregir' ? can.entry : can.exit);

// Por qué la acción ya no aplica al lote leído, o `null` si aplica. Entre que se pidió y se leyó
// el lote, otra persona pudo ingresarlo, sacar todo o anular la salida.
function stateIssue(stock: LotStock, request: DialogRequest): string | null {
  const status = stock.lot.status;
  switch (request.action) {
    case 'ingresar':
      return status === 'classified' ? null : lotStatusMessage(status);
    case 'corregir':
      if (status !== 'in_warehouse') return lotStatusMessage(status);
      return stock.entry?.can_correct ? null : ENTRY_MOVED_MESSAGE;
    case 'salida':
      if (status !== 'in_warehouse') return lotStatusMessage(status);
      return exitableGrades(stock.balances).length > 0
        ? null
        : NO_STOCK_MESSAGE;
    case 'anular': {
      const exit = stock.exits.find(({ id }) => id === request.exitId);
      return exit?.can_void ? null : EXIT_GONE_MESSAGE;
    }
  }
}

// Si se abre el formulario pedido con el lote ya leído, o qué se le dice a la persona.
export function requestOutcome(
  stock: LotStock,
  request: DialogRequest,
  can: WarehousePermissions,
): { open: true } | { open: false; message: string } {
  if (!allowedBy(request.action, can)) {
    return { open: false, message: NO_PERMISSION_MESSAGE };
  }
  const issue = stateIssue(stock, request);
  return issue ? { open: false, message: issue } : { open: true };
}
