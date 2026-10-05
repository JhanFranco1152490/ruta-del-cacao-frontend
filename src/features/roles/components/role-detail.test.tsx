import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PermissionItem, Role } from '../api';
import { RoleDetail } from './role-detail';

const systemRole: Role = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'administrator',
  kind: 'fixed',
  name: 'Administrador',
  description: '',
  producer_id: null,
  producer: null,
  permissions: ['accounts.users_view', 'producers.view'],
  permission_details: [
    { code: 'accounts.users_view', name: 'Consultar usuarios' },
    { code: 'producers.view', name: 'Puede consultar productores' },
  ],
};

// El catálogo solo trae los permisos delegables: los de la asociación no están.
const catalog: PermissionItem[] = [
  {
    code: 'accounts.users_view',
    name: 'Consultar usuarios (catálogo)',
    area: 'users',
    delegable: true,
    grantable: true,
    requires: null,
  },
];

function renderDetail(role: Role) {
  render(
    <RoleDetail
      catalog={catalog}
      manage
      onBusy={vi.fn()}
      onDeleted={vi.fn()}
      role={role}
    />,
  );
}

describe('RoleDetail permissions', () => {
  it('names every permission of the role, also the ones outside the catalog', () => {
    renderDetail(systemRole);

    expect(screen.getByText('Puede consultar productores')).toBeInTheDocument();
    expect(screen.queryByText('producers.view')).not.toBeInTheDocument();
  });

  it('uses the name the role brings, not the catalog one', () => {
    renderDetail(systemRole);

    expect(screen.getByText('Consultar usuarios')).toBeInTheDocument();
    expect(
      screen.queryByText('Consultar usuarios (catálogo)'),
    ).not.toBeInTheDocument();
  });

  it('falls back to the code only if the role brings no name for it', () => {
    renderDetail({
      ...systemRole,
      permissions: ['accounts.users_view', 'crops.unknown'],
      permission_details: [
        { code: 'accounts.users_view', name: 'Consultar usuarios' },
      ],
    });

    expect(screen.getByText('crops.unknown')).toBeInTheDocument();
  });
});
