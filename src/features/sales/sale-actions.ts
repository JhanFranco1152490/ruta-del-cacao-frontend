import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { SaleListItem } from './api';
import { OFFLINE_INVOICE_REASON, OFFLINE_SALES_REASON } from './sale-messages';

export type SalePermissions = {
  view: boolean;
  add: boolean;
  void: boolean;
  // Las fichas de otros módulos a las que lleva una venta, y el alta de un comprador desde el
  // formulario: son de otros permisos.
  viewLot: boolean;
  viewBuyer: boolean;
  addBuyer: boolean;
};

export const salePermissionsOf = (
  user: Parameters<typeof hasPermission>[0],
): SalePermissions => ({
  view: hasPermission(user, PERMISSIONS.SALES_VIEW),
  add: hasPermission(user, PERMISSIONS.SALES_ADD),
  void: hasPermission(user, PERMISSIONS.SALES_VOID),
  viewLot: hasPermission(user, PERMISSIONS.LOTS_VIEW),
  viewBuyer: hasPermission(user, PERMISSIONS.BUYERS_VIEW),
  addBuyer: hasPermission(user, PERMISSIONS.BUYERS_ADD),
});

export type SaleAction =
  'register' | 'void' | 'attach' | 'replace' | 'remove' | 'view-invoice';

// Una acción que se ve: sin conexión no se puede usar y se dice por qué.
export type SaleOffer = {
  action: SaleAction;
  label: string;
  danger: boolean;
  disabledReason: string | null;
};

const offer = (
  action: SaleAction,
  label: string,
  disabledReason: string | null,
  danger = false,
): SaleOffer => ({ action, label, danger, disabledReason });

// «Registrar venta» de la lista: solo con permiso, y deshabilitado sin conexión.
export const registerOffer = (
  can: SalePermissions,
  online: boolean,
): SaleOffer | null =>
  can.add
    ? offer('register', 'Registrar venta', online ? null : OFFLINE_SALES_REASON)
    : null;

// Lo que ofrece la ficha. Una venta anulada conserva su soporte para verlo, pero ya no cambia.
export function saleOffers(
  sale: Pick<SaleListItem, 'status' | 'invoice'>,
  can: SalePermissions,
  online: boolean,
): SaleOffer[] {
  const offline = online ? null : OFFLINE_SALES_REASON;
  const registered = sale.status === 'registered';
  const offers: SaleOffer[] = [];
  if (sale.invoice) {
    offers.push(
      offer('view-invoice', 'Ver', online ? null : OFFLINE_INVOICE_REASON),
    );
  }
  if (registered && can.add) {
    if (sale.invoice) {
      offers.push(offer('replace', 'Reemplazar', offline));
      offers.push(offer('remove', 'Quitar', offline));
    } else {
      offers.push(offer('attach', 'Adjuntar soporte', offline));
    }
  }
  if (registered && can.void) {
    offers.push(offer('void', 'Anular venta', offline, true));
  }
  return offers;
}
