import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { isLotStatus, lotStatusLabel } from '@/lib/lot-status';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';

import { WAREHOUSE_ERROR } from './api';
import { exceedsAvailableMessage } from './exit-quantity';

export type WarehouseForm =
  'warehouse' | 'entry' | 'move' | 'exit' | 'void' | 'delete';

// El rechazo de una escritura de bodega:
// - `field`: un dato que va en su campo (con lo disponible, si la cantidad lo superó);
// - `status`: el lote o la salida ya no admiten la acción (otra persona ingresó, sacó o anuló); se
//   cierra el diálogo, se avisa y se refresca;
// - `stale`: otra persona cambió el registro antes; se recarga;
// - `in-use`: la bodega ya recibió ingresos y no se elimina; se ofrece desactivarla;
// - `form`: lo demás, arriba del formulario.
export type WarehouseFailure =
  | { kind: 'field'; field: string; message: string; availableKg?: string }
  | { kind: 'status'; message: string }
  | { kind: 'stale'; message: string }
  | { kind: 'in-use'; message: string }
  | { kind: 'form'; message: string };

const FIELDS: Record<WarehouseForm, readonly string[]> = {
  warehouse: ['farm_id', 'name'],
  entry: ['entry_date', 'warehouse_id', 'location'],
  move: ['warehouse_id', 'location'],
  exit: ['grade', 'quantity_kg', 'exit_date', 'reason', 'detail'],
  void: ['reason'],
  delete: [],
};

const NETWORK_MESSAGE =
  'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.';

// «El lote ya está en bodega.»: el estado con el que el servidor rechazó la acción.
export function lotStatusMessage(currentStatus: unknown) {
  if (!isLotStatus(currentStatus)) return 'El lote cambió de estado.';
  return `El lote ya está ${lotStatusLabel(currentStatus).toLowerCase()}.`;
}

// Los rechazos que dicen que la acción ya no aplica: su texto es el del servidor.
const NO_LONGER_APPLIES: readonly string[] = [
  WAREHOUSE_ERROR.nothingToStore,
  WAREHOUSE_ERROR.entryHasMovements,
  WAREHOUSE_ERROR.withoutStock,
  WAREHOUSE_ERROR.exitAlreadyVoided,
  WAREHOUSE_ERROR.exitNotVoidable,
];

// Los rechazos de la bodega elegida, que el servidor ya pone en su campo.
const WAREHOUSE_FIELD: readonly string[] = [
  WAREHOUSE_ERROR.nameTaken,
  WAREHOUSE_ERROR.inactive,
  WAREHOUSE_ERROR.farmMismatch,
  WAREHOUSE_ERROR.moveUnchanged,
];

function insufficientFailure(available: unknown): WarehouseFailure {
  const availableKg = typeof available === 'string' ? available : '0.0';
  return {
    kind: 'field',
    field: 'quantity_kg',
    message: exceedsAvailableMessage(availableKg),
    availableKg,
  };
}

function fieldFailure(
  fields: Record<string, string[]>,
  form: WarehouseForm,
): WarehouseFailure | null {
  const field = FIELDS[form].find((name) => fields[name]?.[0]);
  return field ? { kind: 'field', field, message: fields[field]![0] } : null;
}

export function warehouseFailureOf(
  error: unknown,
  form: WarehouseForm,
): WarehouseFailure {
  if (!isApiError(error)) return { kind: 'form', message: NETWORK_MESSAGE };
  const { code } = error;
  if (code === WAREHOUSE_ERROR.lotInvalidStatus) {
    return {
      kind: 'status',
      message: lotStatusMessage(error.body.current_status),
    };
  }
  if (NO_LONGER_APPLIES.includes(code)) {
    return { kind: 'status', message: error.message };
  }
  if (code === WAREHOUSE_ERROR.staleVersion) {
    return { kind: 'stale', message: error.message };
  }
  if (code === WAREHOUSE_ERROR.hasRecords) {
    return { kind: 'in-use', message: error.message };
  }
  if (code === WAREHOUSE_ERROR.stockInsufficient) {
    return insufficientFailure(error.body.available_kg);
  }
  if (code === VALIDATION_ERROR_CODE || WAREHOUSE_FIELD.includes(code)) {
    const failure = fieldFailure(error.fields, form);
    if (failure) return failure;
  }
  return {
    kind: 'form',
    message: getErrorMessage(error, 'No fue posible guardar.'),
  };
}
