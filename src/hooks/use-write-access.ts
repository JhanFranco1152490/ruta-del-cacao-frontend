'use client';

import { useActingProducer } from '@/hooks/use-acting-producer';
import { useSession } from '@/hooks/use-session';
import { hasPermission, type Permission } from '@/lib/permissions';

// Qué puede escribir quien mira la pantalla. La cuenta técnica no tiene productor propio: sin uno
// elegido en el encabezado, lo que registra o edita un productor (fincas, parcelas, fichas) no
// tiene a nombre de quién quedar. Esto solo decide qué mostrar: el servidor lo rechaza igual.
export function useWriteAccess() {
  const { data: user } = useSession();
  const { producerId } = useActingProducer();
  const needsProducer = user?.is_superuser === true && !producerId;
  return {
    needsProducer,
    // Tiene el permiso y, si hace falta, un productor bajo el cual escribir.
    can: (permission: Permission) =>
      hasPermission(user, permission) && !needsProducer,
    // Tiene el permiso, sin mirar el productor: sirve para mostrar la acción deshabilitada.
    has: (permission: Permission) => hasPermission(user, permission),
  };
}
