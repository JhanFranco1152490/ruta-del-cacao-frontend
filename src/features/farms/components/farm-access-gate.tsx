'use client';

import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';
import { useSession } from '@/hooks/use-session';
import { hasPermission, type Permission } from '@/lib/permissions';

// Quien llega a una pantalla de fincas escribiendo la dirección, sin el permiso, no ve el
// formulario: si no, podría guardar en su dispositivo algo que el servidor va a rechazar y que
// quedaría atascado en la bandeja. El servidor autoriza de todos modos cada petición.
export function FarmAccessGate({
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
