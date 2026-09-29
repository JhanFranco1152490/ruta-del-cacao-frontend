import { describe, expect, it } from 'vitest';
import type { PermissionItem } from './api';
import { requiredBy, withRequirements } from './schemas';

const item = (
  code: string,
  requires: string | null = null,
): PermissionItem => ({
  code,
  name: code,
  area: 'Cuentas',
  delegable: true,
  grantable: true,
  requires,
});
const catalog = [
  item('accounts.users_view'),
  item('accounts.users_update', 'accounts.users_view'),
  item('accounts.users_change_status', 'accounts.users_update'),
  item('accounts.roles_manage', 'accounts.missing_view'),
];

describe('withRequirements', () => {
  it('adds the whole chain of required permissions once', () => {
    expect(withRequirements(['accounts.users_change_status'], catalog)).toEqual(
      [
        'accounts.users_change_status',
        'accounts.users_update',
        'accounts.users_view',
      ],
    );
    expect(
      withRequirements(
        ['accounts.users_view', 'accounts.users_update'],
        catalog,
      ),
    ).toEqual(['accounts.users_view', 'accounts.users_update']);
  });

  it('does not add a requirement the catalog does not offer', () => {
    expect(withRequirements(['accounts.roles_manage'], catalog)).toEqual([
      'accounts.roles_manage',
    ]);
  });
});

describe('requiredBy', () => {
  it('lists only the checked permissions that need the code', () => {
    expect(
      requiredBy(
        'accounts.users_view',
        ['accounts.users_view', 'accounts.users_update'],
        catalog,
      ).map((p) => p.code),
    ).toEqual(['accounts.users_update']);
    expect(
      requiredBy('accounts.users_view', ['accounts.users_view'], catalog),
    ).toEqual([]);
  });
});
