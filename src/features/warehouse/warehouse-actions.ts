import type { LotStatus } from '@/lib/lot-status';
import type { WarehouseView } from '@/lib/paths/warehouse';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { StockExit, Warehouse } from './api';

export type WarehousePermissions = {
  view: boolean;
  entry: boolean;
  exit: boolean;
  manage: boolean;
  // La ficha del lote es de otro permiso: quien solo consulta existencias no la ve.
  viewLot: boolean;
};

// Lo que la cuenta puede hacer en bodega, leído de sus permisos.
export const warehousePermissionsOf = (
  user: Parameters<typeof hasPermission>[0],
): WarehousePermissions => ({
  view: hasPermission(user, PERMISSIONS.WAREHOUSE_VIEW_STOCK),
  entry: hasPermission(user, PERMISSIONS.WAREHOUSE_REGISTER_ENTRY),
  exit: hasPermission(user, PERMISSIONS.WAREHOUSE_REGISTER_EXIT),
  manage: hasPermission(user, PERMISSIONS.WAREHOUSE_MANAGE),
  viewLot: hasPermission(user, PERMISSIONS.LOTS_VIEW),
});

export const OFFLINE_WAREHOUSE_REASON =
  'Necesitas conexión para registrar movimientos de bodega.';

// La ficha del lote no guarda copia de los lotes de bodega: sin conexión no se abre.
export const OFFLINE_LOT_REASON = 'Ver el lote necesita conexión.';

// Una acción que se ve: sin conexión no se puede usar y se dice por qué.
export type Offer<A extends string> = {
  action: A;
  label: string;
  danger: boolean;
  disabledReason: string | null;
};

const offer = <A extends string>(
  action: A,
  label: string,
  online: boolean,
  danger = false,
): Offer<A> => ({
  action,
  label,
  danger,
  disabledReason: online ? null : OFFLINE_WAREHOUSE_REASON,
});

// Las pestañas que ve la cuenta: los lotes por ingresar solo los lee quien puede ingresarlos.
export const warehouseViews = (can: WarehousePermissions): WarehouseView[] =>
  can.entry
    ? ['existencias', 'por-ingresar', 'bodegas']
    : ['existencias', 'bodegas'];

// La pestaña que se muestra: la de la dirección si la cuenta la ve, o Existencias.
export const resolveWarehouseView = (
  requested: WarehouseView | null,
  can: WarehousePermissions,
): WarehouseView =>
  requested && warehouseViews(can).includes(requested)
    ? requested
    : 'existencias';

export type LotStockAction = 'ingresar' | 'salida' | 'corregir';

// Lo que se puede hacer con el cacao de un lote: el Clasificado se ingresa; del que está En bodega
// se registra una salida si le queda algo, y el ingreso se corrige mientras nada haya salido.
export function lotStockActions({
  status,
  canCorrect,
  hasStock,
  online,
  can,
}: {
  status: LotStatus;
  canCorrect: boolean;
  hasStock: boolean;
  online: boolean;
  can: WarehousePermissions;
}): Offer<LotStockAction>[] {
  if (status === 'classified') {
    return can.entry ? [offer('ingresar', 'Ingresar a bodega', online)] : [];
  }
  if (status !== 'in_warehouse') return [];
  const allowed: [LotStockAction, string, boolean][] = [
    ['salida', 'Registrar salida', can.exit && hasStock],
    ['corregir', 'Corregir ingreso', can.entry && canCorrect],
  ];
  return allowed
    .filter(([, , may]) => may)
    .map(([action, label]) => offer(action, label, online));
}

// Ingresar un lote de la lista Por ingresar: todos están Clasificado, así que solo depende del
// permiso.
export const pendingEntryOffer = (
  online: boolean,
  can: WarehousePermissions,
): Offer<'ingresar'> | null =>
  can.entry ? offer('ingresar', 'Ingresar a bodega', online) : null;

// Registrar una salida desde una fila de existencias: toda fila es de un lote En bodega con kilos,
// así que solo depende del permiso.
export const stockExitOffer = (
  online: boolean,
  can: WarehousePermissions,
): Offer<'salida'> | null =>
  can.exit ? offer('salida', 'Registrar salida', online) : null;

// Anular una salida: solo una manual que sigue vigente, y con el permiso de registrar salidas.
export const exitVoidOffer = (
  exit: Pick<StockExit, 'can_void'>,
  online: boolean,
  can: WarehousePermissions,
): Offer<'anular'> | null =>
  can.exit && exit.can_void ? offer('anular', 'Anular', online, true) : null;

export type WarehouseItemAction =
  'editar' | 'activar' | 'desactivar' | 'eliminar';

// Lo que se hace con una bodega: editarla, activarla o desactivarla, y eliminarla solo si nunca
// recibió un ingreso (la usada se desactiva).
export function warehouseItemActions(
  warehouse: Pick<Warehouse, 'is_active' | 'in_use'>,
  online: boolean,
  can: WarehousePermissions,
): Offer<WarehouseItemAction>[] {
  if (!can.manage) return [];
  const offers = [
    offer<WarehouseItemAction>('editar', 'Editar', online),
    warehouse.is_active
      ? offer<WarehouseItemAction>('desactivar', 'Desactivar', online)
      : offer<WarehouseItemAction>('activar', 'Activar', online),
  ];
  if (!warehouse.in_use) {
    offers.push(
      offer<WarehouseItemAction>('eliminar', 'Eliminar', online, true),
    );
  }
  return offers;
}
