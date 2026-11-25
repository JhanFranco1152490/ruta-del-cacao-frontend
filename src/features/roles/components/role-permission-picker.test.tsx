import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PermissionItem } from '../api';
import { RolePermissionPicker } from './role-permission-picker';

const permission = (code: string, area: string): PermissionItem => ({
  code,
  name: `Puede ${code}`,
  area,
  delegable: true,
  grantable: true,
  requires: null,
});

describe('RolePermissionPicker', () => {
  it('shows the sections in the order of the work, with their names in Spanish', () => {
    render(
      <RolePermissionPicker
        catalog={[
          permission('roles.view', 'roles'),
          permission('users.view', 'users'),
          permission('crops.change', 'crops'),
          permission('farms.add', 'farms'),
        ]}
        onChange={vi.fn()}
        value={[]}
      />,
    );

    const titles = screen
      .getAllByRole('group')
      .slice(1)
      .map((group) => group.querySelector('legend')?.textContent);
    expect(titles).toEqual([
      'Fincas',
      'Caracterización de parcelas',
      'Cuentas',
      'Roles',
    ]);
    expect(screen.queryByText('farms')).not.toBeInTheDocument();
  });

  // El rol Productor trae la bitácora, que no se delega: se ve en su área, pero nadie la concede.
  it('shows a permission that cannot be delegated without letting anyone grant it', () => {
    render(
      <RolePermissionPicker
        catalog={[
          { ...permission('audit.view_audit_log', 'audit'), delegable: false },
        ]}
        onChange={vi.fn()}
        value={[]}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Bitácora de cambios' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /audit\.view_audit_log/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('No puedes conceder este permiso.'),
    ).toBeInTheDocument();
  });
});
