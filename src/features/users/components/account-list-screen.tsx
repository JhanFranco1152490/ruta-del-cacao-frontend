'use client';
import { ErrorState } from '@/components/error-state';
import { useSession } from '@/features/auth/api';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AccountWorkspace } from './account-workspace';
export function AccountListScreen() {
  const session = useSession();
  if (session.isPending) return <p role="status">Cargando sesión…</p>;
  if (!session.data || !hasPermission(session.data, PERMISSIONS.USERS_VIEW))
    return <ErrorState message="Acceso no disponible" />;
  return <AccountWorkspace user={session.data} />;
}
