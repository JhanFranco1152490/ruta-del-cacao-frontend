import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { TOO_LARGE_MESSAGE } from '@/lib/files/upload-limits';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';
import { exceedsAvailableMessage } from '@/lib/stock-quantity';

import { type Sale, SALE_ERROR } from './api';

// El rechazo de una escritura de ventas:
// - `line`: lo que cambió entretanto en una línea (alguien vendió o sacó esos kilos, el lote salió de
//   bodega); va en su línea y, si es la cantidad, con lo disponible de ahora;
// - `field`: un dato del encabezado o del motivo, en su campo;
// - `lines`: un error de las líneas que el servidor no ubica (llegan sin índice), arriba de ellas;
// - `invoice`: el archivo del soporte;
// - `voided`: la venta ya estaba anulada; se avisa y se recarga;
// - `stale`: otra persona la cambió antes; se recarga con la vigente;
// - `form`: lo demás, arriba del formulario.
export type SaleFailure =
  | {
      kind: 'line';
      index: number;
      field: 'stock' | 'quantity_kg';
      message: string;
      availableKg?: string;
    }
  | { kind: 'field'; field: string; message: string }
  | { kind: 'lines'; message: string }
  | { kind: 'invoice'; message: string }
  | { kind: 'voided'; message: string }
  | { kind: 'stale'; message: string; current: Sale | null }
  | { kind: 'form'; message: string };

export const LOT_LEFT_WAREHOUSE_MESSAGE = 'Este lote ya no está en bodega.';
export const LOT_OF_OTHER_FARM_MESSAGE =
  'Este lote no es de la finca de la venta.';
export const INVOICE_FORMAT_MESSAGE = 'Solo se permiten PDF, JPG o PNG.';
const NETWORK_MESSAGE =
  'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.';

// Los campos de los formularios de ventas que el servidor puede señalar, en el orden en que se ven.
const FIELDS = ['farm_id', 'buyer_id', 'sale_date', 'notes', 'reason'];

function lineFailure(
  code: string,
  index: number,
  body: Record<string, unknown>,
): SaleFailure | null {
  if (code === SALE_ERROR.stockInsufficient) {
    const availableKg =
      typeof body.available_kg === 'string' ? body.available_kg : '0.0';
    return {
      kind: 'line',
      index,
      field: 'quantity_kg',
      message: exceedsAvailableMessage(availableKg),
      availableKg,
    };
  }
  if (code === SALE_ERROR.lotInvalidStatus) {
    return {
      kind: 'line',
      index,
      field: 'stock',
      message: LOT_LEFT_WAREHOUSE_MESSAGE,
    };
  }
  if (code === SALE_ERROR.notFound) {
    return {
      kind: 'line',
      index,
      field: 'stock',
      message: LOT_OF_OTHER_FARM_MESSAGE,
    };
  }
  return null;
}

export function saleFailureOf(error: unknown): SaleFailure {
  if (!isApiError(error)) return { kind: 'form', message: NETWORK_MESSAGE };
  const { code, fields, body } = error;
  if (typeof body.line === 'number') {
    const failure = lineFailure(code, body.line, body);
    if (failure) return failure;
  }
  if (code === SALE_ERROR.saleVoided) {
    return { kind: 'voided', message: error.message };
  }
  if (code === SALE_ERROR.staleVersion) {
    return {
      kind: 'stale',
      message: error.message,
      current: (body.current as Sale | undefined) ?? null,
    };
  }
  if (code === SALE_ERROR.invoiceTooLarge) {
    return { kind: 'invoice', message: `${TOO_LARGE_MESSAGE}.` };
  }
  if (code === SALE_ERROR.invoiceFormat) {
    return { kind: 'invoice', message: INVOICE_FORMAT_MESSAGE };
  }
  if (code === VALIDATION_ERROR_CODE || code === SALE_ERROR.buyerInactive) {
    const field = FIELDS.find((name) => fields[name]?.[0]);
    if (field) return { kind: 'field', field, message: fields[field]![0] };
    if (fields.lines?.[0]) return { kind: 'lines', message: fields.lines[0] };
  }
  return {
    kind: 'form',
    message: getErrorMessage(error, 'No fue posible guardar.'),
  };
}
