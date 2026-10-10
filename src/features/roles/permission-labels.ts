import type { PermissionItem, Role } from './api';

// El catálogo del servidor no trae los permisos de expedientes: sin esto se verían los códigos.
const FALLBACK_NAMES: Record<string, string> = {
  'producers.view': 'Puede consultar los expedientes de productores',
  'producers.create': 'Puede registrar productores',
  'producers.update': 'Puede actualizar los expedientes de productores',
  'producers.change_status':
    'Puede activar o desactivar productores (al desactivar uno, también se bloquea el acceso de su cuenta y el de sus empleados)',
};

// El Administrador solo gestiona cuentas de la asociación y de productores, nunca las de sus
// empleados ni sus roles propios: el nombre general del catálogo no lo dice.
const ADMINISTRATOR_NAMES: Record<string, string> = {
  'accounts.users_view':
    'Puede consultar cuentas de productores y administradores',
  'accounts.users_create':
    'Puede crear cuentas de productores y administradores',
  'accounts.users_update':
    'Puede actualizar cuentas de productores y administradores',
  'accounts.users_change_status':
    'Puede activar o desactivar cuentas de productores y administradores',
};
// La asociación ya no crea roles propios (son de cada productor).
const ADMINISTRATOR_HIDDEN = new Set(['accounts.roles_manage']);

export function permissionNames(role: Role, catalog: PermissionItem[]) {
  const administrator = role.code === 'administrator';
  return role.permissions
    .filter((code) => !(administrator && ADMINISTRATOR_HIDDEN.has(code)))
    .map((code) => ({
      code,
      name:
        (administrator ? ADMINISTRATOR_NAMES[code] : undefined) ??
        catalog.find((item) => item.code === code)?.name ??
        FALLBACK_NAMES[code] ??
        code,
    }));
}
