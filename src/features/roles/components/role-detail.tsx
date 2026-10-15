'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { roleScopeLabel } from '@/lib/farm-scope';
import { groupRolePermissions } from '../permission-areas';
import { canEditRole } from '../schemas';
import type { PermissionItem, Role } from '../api';
import { RoleForm } from './role-form';
import { RolePermissionAreas } from './role-permission-areas';
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
  if (editing && editable)
    return (
      <div className="px-5 py-4">
        <RoleForm
          role={role}
          catalog={catalog}
          onBusy={onBusy}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  // El nombre lo trae el propio rol: el catálogo solo ofrece los permisos delegables, y los de un
  // rol del sistema (los de la asociación, por ejemplo) no están en él. Sin nombre, se ve el código.
  const names = new Map(
    role.permission_details.map((item) => [item.code, item.name]),
  );
  const groups = groupRolePermissions(
    role.permissions.map((code) => ({ code, name: names.get(code) ?? code })),
  );
  const kindLabel = role.kind === 'custom' ? 'Rol propio' : 'Rol del sistema';
  return (
    <div>
      {/* La franja de arriba dice de un vistazo qué rol es: nombre, de qué tipo y cuántos permisos. */}
      <div
        className="bg-gradient-to-br from-selva to-selva-2 px-5 pt-5 pr-12 pb-4 text-white"
        data-role-band
      >
        <h2 className="font-serif text-3xl break-words">{role.name}</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
          <span className="rounded-full bg-white px-3 py-1 text-selva">
            {kindLabel}
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1">
            {role.permissions.length}{' '}
            {role.permissions.length === 1 ? 'permiso' : 'permisos'}
          </span>
          {role.farm_scope && (
            <span className="rounded-full bg-white/20 px-3 py-1">
              {roleScopeLabel(role.farm_scope)}
            </span>
          )}
          <span className="rounded-full bg-white/20 px-3 py-1">
            {editable ? 'Se puede editar' : 'Solo lectura'}
          </span>
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <p className="break-words">{role.description || 'Sin descripción.'}</p>
        {!editable && (
          <p className="flex items-start gap-2 rounded-(--radius) bg-info-bg px-3 py-2 text-sm font-bold text-info">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {role.kind !== 'custom'
              ? 'Los roles del sistema no se pueden modificar.'
              : 'No tienes permiso para administrar este rol o conceder todos sus permisos.'}
          </p>
        )}
        <h3 className="font-bold">Permisos asignados</h3>
        {groups.length ? (
          <RolePermissionAreas groups={groups} />
        ) : (
          <p>Sin permisos asignados.</p>
        )}
        {editable && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setEditing(true)}>Editar rol</Button>
            <RoleDeleteDialog
              role={role}
              onDeleted={onDeleted}
              onBusy={onBusy}
            />
          </div>
        )}
      </div>
    </div>
  );
}
