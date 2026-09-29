'use client';
import { useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ErrorState } from '@/components/error-state';
import { isApiError } from '@/lib/api/errors';
import { useRole, usePermissionCatalog } from '../api';
import { isRoleId } from '../schemas';
import { RoleForm } from './role-form';
import { RoleDetail } from './role-detail';

type Props = {
  selected: string;
  manage: boolean;
  canCreate: boolean;
  producer?: string;
  close: () => void;
  open: (id: string) => void;
};
export function RolePanel(props: Props) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  function onBusy(value: boolean) {
    lock.current = value;
    setBusy(value);
  }
  return (
    <Sheet
      open
      onOpenChange={(value) => {
        if (!value && !lock.current) props.close();
      }}
    >
      <SheetContent side="right" showCloseButton={!busy}>
        <SheetHeader>
          <SheetTitle>
            {props.selected === 'nuevo' ? 'Crear rol' : 'Detalle del rol'}
          </SheetTitle>
          <SheetDescription>
            Consulta los permisos y administra los roles propios.
          </SheetDescription>
        </SheetHeader>
        {props.selected === 'nuevo' ? (
          props.canCreate ? (
            <NewRole {...props} onBusy={onBusy} />
          ) : (
            <ErrorState message="No puedes crear un rol sin permiso y un productor válido." />
          )
        ) : isRoleId(props.selected) ? (
          <ExistingRole {...props} onBusy={onBusy} />
        ) : (
          <ErrorState message="Rol no disponible" />
        )}
      </SheetContent>
    </Sheet>
  );
}
function NewRole({
  producer,
  open,
  close,
  onBusy,
}: Props & { onBusy: (value: boolean) => void }) {
  const catalog = usePermissionCatalog();
  if (catalog.isPending) return <p role="status">Cargando permisos…</p>;
  if (catalog.isError)
    return (
      <ErrorState
        message="No fue posible cargar los permisos."
        onRetry={() => {
          void catalog.refetch();
        }}
      />
    );
  return (
    <RoleForm
      catalog={catalog.data}
      producer={producer}
      onBusy={onBusy}
      onSaved={(role) => open(role.id)}
      onCancel={close}
    />
  );
}
function ExistingRole({
  selected,
  manage,
  close,
  onBusy,
}: Props & { onBusy: (value: boolean) => void }) {
  const role = useRole(selected);
  const catalog = usePermissionCatalog();
  if (role.isError)
    return (
      <ErrorState
        message={
          isApiError(role.error) && [403, 404].includes(role.error.status)
            ? 'Rol no disponible'
            : 'No fue posible cargar el rol.'
        }
        onRetry={() => {
          void role.refetch();
        }}
      />
    );
  if (catalog.isError)
    return (
      <ErrorState
        message="No fue posible cargar los permisos."
        onRetry={() => {
          void catalog.refetch();
        }}
      />
    );
  if (role.isPending || catalog.isPending)
    return <p role="status">Cargando rol…</p>;
  return (
    <RoleDetail
      role={role.data}
      catalog={catalog.data}
      manage={manage}
      onBusy={onBusy}
      onDeleted={close}
    />
  );
}
