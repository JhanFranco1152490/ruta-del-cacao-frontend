import type { Account } from '@/lib/api/accounts';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { hasFixedRole, isProducerAccount } from './schemas';

type SessionUser = components['schemas']['SessionUser'];

// Qué puede hacer quien mira con una cuenta. Nadie modifica la suya (`self_modification`), y desde
// el espacio del productor nadie alcanza a la cuenta Productor: solo la asociación la administra.
// Eliminar es para la cuenta que nunca entró; los roles de una cuenta de rol fijo no cambian.
export function accountActions(account: Account, user: SessionUser) {
  const reachable =
    account.id !== user.id && !(isProducerAccount(account) && user.producer_id);
  const canUpdate = reachable && hasPermission(user, PERMISSIONS.USERS_UPDATE);
  return {
    canUpdate,
    canChangeStatus:
      reachable && hasPermission(user, PERMISSIONS.USERS_CHANGE_STATUS),
    canDelete:
      reachable &&
      !account.has_signed_in &&
      hasPermission(user, PERMISSIONS.USERS_DELETE),
    canChangeRoles:
      canUpdate &&
      !hasFixedRole(account) &&
      hasPermission(user, PERMISSIONS.ROLES_VIEW),
  };
}

// Las fincas de un empleado las asigna quien alcanza todas (el Productor o la cuenta técnica); la
// cuenta técnica las elige entre las del productor de la cuenta.
export const farmAssignerFor = (account: Account, user: SessionUser) =>
  user.all_farms && account.producer && !hasFixedRole(account)
    ? {
        userId: user.id,
        producer: user.producer_id ? undefined : account.producer.id,
      }
    : undefined;
