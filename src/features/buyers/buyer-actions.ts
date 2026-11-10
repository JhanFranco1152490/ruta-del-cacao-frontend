import type { Buyer } from './api';
import {
  BUYER_HAS_RECORDS_REASON,
  BUYER_NEEDS_CONNECTION,
} from './buyer-messages';

export type BuyerActionKind = 'edit' | 'deactivate' | 'activate' | 'delete';

// Una acción con `disabledReason` se ve pero no se toca, y dice por qué.
export type BuyerAction = {
  kind: BuyerActionKind;
  disabledReason?: string;
};

export type BuyerPermissions = { canChange: boolean; canDelete: boolean };

// Lo que se ofrece en cada comprador, y si va en botones o en el menú «⋯» (desde la tercera
// acción). Solo decide qué mostrar: el servidor vuelve a comprobar cada regla, porque una venta
// pudo registrarse desde otro dispositivo después de cargar la lista.
export function buyerActions(
  buyer: Pick<Buyer, 'is_active' | 'has_records'>,
  { canChange, canDelete }: BuyerPermissions,
  online: boolean,
): { actions: BuyerAction[]; inMenu: boolean } {
  const offline = online ? undefined : BUYER_NEEDS_CONNECTION;
  const actions: BuyerAction[] = [];

  if (canChange) {
    actions.push({ kind: 'edit', disabledReason: offline });
    actions.push({
      kind: buyer.is_active ? 'deactivate' : 'activate',
      disabledReason: offline,
    });
  }
  // Se ve siempre, para que nadie adivine por qué a uno sí y a otro no.
  if (canDelete) {
    actions.push({
      kind: 'delete',
      disabledReason: buyer.has_records ? BUYER_HAS_RECORDS_REASON : offline,
    });
  }
  return { actions, inMenu: actions.length >= 3 };
}
