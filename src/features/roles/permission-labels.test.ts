import { describe, expect, it } from 'vitest';
import type { PermissionItem, Role } from './api';
import { permissionNames } from './permission-labels';

const item = (code: string, name: string): PermissionItem => ({
  code,
  name,
  area: 'Cuentas',
  delegable: true,
  grantable: true,
  requires: null,
});
const catalog = [
  item('accounts.users_view', 'Puede consultar cuentas'),
  item('accounts.roles_manage', 'Puede crear, editar y borrar roles propios'),
];
const role = (code: string | null, permissions: string[]) =>
  ({ code, permissions }) as Role;

describe('permissionNames', () => {
  it('names the producer permissions the catalog leaves out', () => {
    expect(
      permissionNames(role('foreman', ['producers.view']), catalog),
    ).toEqual([
      {
        code: 'producers.view',
        name: 'Puede consultar los expedientes de productores',
      },
    ]);
  });

  it('scopes the administrator to producer and administrator accounts', () => {
    expect(
      permissionNames(
        role('administrator', ['accounts.users_view', 'accounts.roles_manage']),
        catalog,
      ),
    ).toEqual([
      {
        code: 'accounts.users_view',
        name: 'Puede consultar cuentas de productores y administradores',
      },
    ]);
  });

  it('keeps the catalog names for any other role', () => {
    expect(
      permissionNames(
        role('foreman', ['accounts.users_view', 'accounts.roles_manage']),
        catalog,
      ).map(({ name }) => name),
    ).toEqual([
      'Puede consultar cuentas',
      'Puede crear, editar y borrar roles propios',
    ]);
  });

  it('falls back to the code when nothing names it', () => {
    expect(
      permissionNames(role('foreman', ['unknown.permission']), catalog),
    ).toEqual([{ code: 'unknown.permission', name: 'unknown.permission' }]);
  });
});
