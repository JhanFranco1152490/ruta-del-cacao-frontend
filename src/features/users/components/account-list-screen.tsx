'use client';
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/error-state';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AccountWorkspace } from './account-workspace';
// `accessCard` lo compone la página: la tarjeta del interruptor es de otro dominio.
export function AccountListScreen({ accessCard }: { accessCard?: ReactNode }) {
  const session = useSession();
  if (session.isPending) return <p role="status">Cargando sesión…</p>;
  if (!session.data || !hasPermission(session.data, PERMISSIONS.USERS_VIEW))
    return <ErrorState message="Acceso no disponible" />;
  return <AccountWorkspace user={session.data} accessCard={accessCard} />;
}
