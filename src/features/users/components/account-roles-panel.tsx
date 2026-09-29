'use client';
import { ErrorState } from '@/components/error-state';
import { useRoleOptions } from '@/lib/api/role-options';
import type { components } from '@/lib/api/schema';
import type { Account } from '../api';
import { assignableRoles } from '../schemas';
import { AccountRolesForm } from './account-roles-form';

// Carga el catálogo y ofrece solo los roles que quien mira puede asignar a esta cuenta.
export function AccountRolesPanel({
  account,
  user,
  onDone,
  onBusy,
}: {
  account: Account;
  user: components['schemas']['SessionUser'];
  onDone: () => void;
  onBusy: (value: boolean) => void;
}) {
  const catalog = useRoleOptions();
  if (catalog.isPending)
    return <p role="status">Cargando roles disponibles…</p>;
  if (catalog.isError)
    return (
      <ErrorState
        message="No fue posible cargar los roles."
        onRetry={() => {
          void catalog.refetch();
        }}
      />
    );
  const roles = assignableRoles(
    catalog.data,
    user.permissions,
    !user.producer_id,
    account.producer?.id,
  );
  return (
    <AccountRolesForm
      account={account}
      roles={roles}
      onDone={onDone}
      onBusy={onBusy}
    />
  );
}
