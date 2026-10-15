'use client';
import { ErrorState } from '@/components/error-state';
import { useRoleOptions } from '@/lib/api/role-options';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { AccountCreated } from '../api';
import { assignableRoles } from '../schemas';
import { AccountForm } from './account-form';

export function AccountCreatePanel({
  user,
  producer,
  onCreated,
  onBusy,
  close,
}: {
  user: components['schemas']['SessionUser'];
  producer?: string;
  onCreated: (account: AccountCreated) => void;
  onBusy: (value: boolean) => void;
  close: () => void;
}) {
  const canReadRoles = hasPermission(user, PERMISSIONS.ROLES_VIEW);
  const catalog = useRoleOptions(canReadRoles);
  if (!canReadRoles)
    return (
      <ErrorState message="Necesitas permiso para consultar los roles antes de crear una cuenta." />
    );
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
  const association = !user.producer_id;
  const target = association ? producer : (user.producer_id ?? undefined);
  const roles = assignableRoles(
    catalog.data,
    user.permissions,
    association,
    target,
  );
  if (!roles.length)
    return (
      <ErrorState message="No hay roles disponibles para crear esta cuenta." />
    );
  const administrator = association && !producer;
  return (
    <AccountForm
      roles={roles}
      administrator={administrator}
      producer={association ? producer : undefined}
      // La finca la asigna quien alcanza todas (el Productor o la cuenta técnica) y solo a un
      // empleado: las cuentas de la asociación y la del Productor no la llevan.
      farmsOf={
        user.all_farms && !administrator
          ? { userId: user.id, producer: association ? producer : undefined }
          : undefined
      }
      onCreated={onCreated}
      onBusy={onBusy}
      onCancel={close}
    />
  );
}
