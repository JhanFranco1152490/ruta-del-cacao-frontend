import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Reciben avisos las cuentas de un productor que ven actividades. La cuenta técnica lo ve todo y
// le llegaría cada aviso de cada productor, y la asociación no tiene actividades: ninguna tiene
// productor propio, así que no tienen campana.
export const receivesNotifications = (
  user:
    | { producer_id?: string | null; permissions?: readonly string[] }
    | null
    | undefined,
) => !!user?.producer_id && hasPermission(user, PERMISSIONS.ACTIVITIES_VIEW);
