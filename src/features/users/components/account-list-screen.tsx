'use client';
import { PermissionGate } from '@/components/permission-gate';
import { useSession } from '@/hooks/use-session';
import { PERMISSIONS } from '@/lib/permissions';
import { AccountWorkspace } from './account-workspace';
export function AccountListScreen() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.USERS_VIEW]}>
      <AccountListContent />
    </PermissionGate>
  );
}
function AccountListContent() {
  // El guardián ya esperó la sesión y comprobó el permiso: aquí la sesión está cargada.
  const { data: user } = useSession();
  if (!user) return null;
  return <AccountWorkspace user={user} />;
}
