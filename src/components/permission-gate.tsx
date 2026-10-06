'use client';

import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';
import { useSession } from '@/hooks/use-session';
import { hasPermission, type Permission } from '@/lib/permissions';

// Quien llega a una pantalla escribiendo la dirección, sin ninguno de los permisos, no la ve. En
// las pantallas de captura importa más: podría guardar en su dispositivo algo que el servidor
// va a rechazar y que quedaría atascado en la cola. El servidor autoriza de todos modos cada
// petición; esto solo decide qué mostrar.
export function PermissionGate({
  anyOf,
  children,
}: {
  anyOf: readonly Permission[];
  children: ReactNode;
}) {
  const session = useSession();
  if (session.isPending) return <p role="status">Cargando sesión…</p>;
  if (!anyOf.some((permission) => hasPermission(session.data, permission))) {
    return <ErrorState message="Acceso no disponible" />;
  }
  return children;
}
