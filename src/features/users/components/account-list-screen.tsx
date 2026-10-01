'use client';
import type { ReactNode } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { useSession } from '@/hooks/use-session';
import { PERMISSIONS } from '@/lib/permissions';
import { AccountWorkspace } from './account-workspace';
// `accessCard` lo compone la página: la tarjeta del interruptor es de otro dominio.
export function AccountListScreen({ accessCard }: { accessCard?: ReactNode }) {
  return (
    <PermissionGate anyOf={[PERMISSIONS.USERS_VIEW]}>
      <AccountListContent accessCard={accessCard} />
    </PermissionGate>
  );
}
function AccountListContent({ accessCard }: { accessCard?: ReactNode }) {
  // El guardián ya esperó la sesión y comprobó el permiso: aquí la sesión está cargada.
  const { data: user } = useSession();
  if (!user) return null;
  return <AccountWorkspace user={user} accessCard={accessCard} />;
}
