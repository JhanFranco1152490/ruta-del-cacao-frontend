import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Reciben avisos las cuentas de un productor que ven actividades (los de labores y sanidad) o lotes
// (los de poscosecha): son los dos permisos con que la bandeja del servidor deja ver cada grupo, y
// un rol propio puede tener uno sin el otro. La cuenta técnica lo ve todo y le llegaría cada aviso
// de cada productor, y la asociación no tiene productor propio, así que no tienen campana.
export const receivesNotifications = (
  user:
    | { producer_id?: string | null; permissions?: readonly string[] }
    | null
    | undefined,
) =>
  !!user?.producer_id &&
  (hasPermission(user, PERMISSIONS.ACTIVITIES_VIEW) ||
    hasPermission(user, PERMISSIONS.LOTS_VIEW));
