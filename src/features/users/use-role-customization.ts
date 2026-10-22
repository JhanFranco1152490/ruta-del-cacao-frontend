'use client';

import { useState } from 'react';

import type { Role } from '@/lib/api/roles';

// Lo que necesita un formulario de cuenta para "Personalizar permisos": qué rol se está
// personalizando y la lista de roles con los recién creados, que se ofrecen de una vez aunque la
// lista del servidor todavía no se haya vuelto a leer.
export function useRoleCustomization(roles: Role[], enabled: boolean) {
  const [customizing, setCustomizing] = useState<Role>();
  const [created, setCreated] = useState<Role[]>([]);
  const list = [
    ...roles,
    ...created.filter((role) => !roles.some(({ id }) => id === role.id)),
  ];
  // Solo un rol del sistema con permisos: los propios se editan en Roles.
  const canCustomize = (role: Role) =>
    enabled && role.kind === 'predefined' && role.permissions.length > 0;
  const roleOf = (option: { id: string }) =>
    list.find(({ id }) => id === option.id);
  return {
    roles: list,
    customizing,
    canCustomize,
    start: (role: Role) => setCustomizing(role),
    // Para las casillas de roles, que hablan de opciones y no de roles.
    checkboxHandlers: {
      canCustomize: (option: { id: string }) => {
        const role = roleOf(option);
        return !!role && canCustomize(role);
      },
      onCustomize: (option: { id: string }) => {
        const role = roleOf(option);
        if (role) setCustomizing(role);
      },
    },
    close: () => setCustomizing(undefined),
    // Agrega el rol nuevo y devuelve la selección con él en lugar del que se personalizó.
    finish: (role: Role, selected: string[]) => {
      const base = customizing;
      setCreated((previous) => [...previous, role]);
      setCustomizing(undefined);
      return [...selected.filter((id) => id !== base?.id), role.id];
    },
  };
}
