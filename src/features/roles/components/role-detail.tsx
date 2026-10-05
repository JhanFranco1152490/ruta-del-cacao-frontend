'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { canEditRole } from '../schemas';
import type { PermissionItem, Role } from '../api';
import { RoleForm } from './role-form';
import { RoleDeleteDialog } from './role-delete-dialog';

export function RoleDetail({
  role,
  catalog,
  manage,
  onBusy,
  onDeleted,
}: {
  role: Role;
  catalog: PermissionItem[];
  manage: boolean;
  onBusy: (busy: boolean) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const editable = manage && canEditRole(role, catalog);
  // El nombre lo trae el propio rol: el catálogo solo ofrece los permisos delegables, y los de un
  // rol del sistema (los de la asociación, por ejemplo) no están en él.
  const names = new Map(
    role.permission_details.map((item) => [item.code, item.name]),
  );
  if (editing && editable)
    return (
      <RoleForm
        role={role}
        catalog={catalog}
        onBusy={onBusy}
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  return (
    <div className="space-y-5">
      <h2 className="font-serif text-2xl break-words text-selva">
        {role.name}
      </h2>
      <StatusBadge tone={editable ? 'ok' : 'info'}>
        {editable ? 'Rol propio' : 'Solo lectura'}
      </StatusBadge>
      <p className="break-words">{role.description || 'Sin descripción.'}</p>
      {!editable && (
        <p className="text-sm text-muted-foreground">
          {role.kind !== 'custom'
            ? 'Los roles del sistema no se pueden modificar.'
            : 'No tienes permiso para administrar este rol o conceder todos sus permisos.'}
        </p>
      )}
      <h3 className="font-bold">Permisos asignados</h3>
      {role.permissions.length ? (
        <ul className="list-inside list-disc space-y-2">
          {role.permissions.map((code) => (
            <li className="break-words" key={code}>
              {names.get(code) ?? code}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin permisos asignados.</p>
      )}
      {editable && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setEditing(true)}>Editar rol</Button>
          <RoleDeleteDialog role={role} onDeleted={onDeleted} onBusy={onBusy} />
        </div>
      )}
    </div>
  );
}
