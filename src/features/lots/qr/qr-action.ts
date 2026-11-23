import type { Lot } from '../api';

// El código QR solo existe desde la clasificación: antes no hay calidad que mostrar, y un lote
// descartado completo no lo tiene nunca.
const QR_STATUSES: readonly Lot['status'][] = ['classified', 'in_warehouse'];

export type QrAction = 'generate' | 'view' | 'none';

// Qué ofrece la ficha del lote sobre su código QR: generarlo (clasificado o en bodega, sin código y
// con permiso), verlo y descargarlo (cualquiera que lea el lote, si ya existe) o nada.
export function qrAction(
  lot: Pick<Lot, 'status' | 'qr'>,
  canGenerate: boolean,
): QrAction {
  if (lot.qr) return 'view';
  return canGenerate && QR_STATUSES.includes(lot.status) ? 'generate' : 'none';
}
