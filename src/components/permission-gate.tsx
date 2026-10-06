'use client';

import type { ReactNode } from 'react';

import { ACTING_PRODUCER_REASON } from '@/components/acting-producer-notice';
import { ErrorState } from '@/components/error-state';
import { PageNotice } from '@/components/page-notice';
import { useSession } from '@/hooks/use-session';
import { useWriteAccess } from '@/hooks/use-write-access';
import { hasPermission, type Permission } from '@/lib/permissions';

// Quien llega a una pantalla escribiendo la dirección, sin ninguno de los permisos, no la ve. En
// las pantallas de captura importa más: podría guardar en su dispositivo algo que el servidor
// va a rechazar y que quedaría atascado en la cola. El servidor autoriza de todos modos cada
// petición; esto solo decide qué mostrar.
//
// Con `needsProducer`, la pantalla escribe a nombre de un productor: la cuenta técnica, que no tiene
// uno propio, debe elegirlo en el encabezado antes de ver el formulario.
export function PermissionGate({
  anyOf,
  needsProducer = false,
  children,
}: {
  anyOf: readonly Permission[];
  needsProducer?: boolean;
  children: ReactNode;
}) {
  const session = useSession();
  const write = useWriteAccess();
  if (session.isPending) return <p role="status">Cargando sesión…</p>;
  if (!anyOf.some((permission) => hasPermission(session.data, permission))) {
    return <ErrorState message="Acceso no disponible" />;
  }
  if (needsProducer && write.needsProducer) {
    return (
      <PageNotice
        title="Elige un productor"
        description={ACTING_PRODUCER_REASON}
      />
    );
  }
  return children;
}
