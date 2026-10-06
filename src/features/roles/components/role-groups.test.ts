import { describe, expect, it } from 'vitest';

import type { Role } from '../api';
import { groupRoles } from './role-groups';

const role = (id: string, kind: Role['kind'], owner?: string): Role =>
  ({
    id,
    kind,
    name: id,
    permissions: [],
    producer: owner
      ? {
          id: owner,
          member_code: `PROD-${owner}`,
          first_name: owner,
          last_name: 'Prueba',
        }
      : null,
  }) as unknown as Role;

describe('groupRoles', () => {
  it('separates the system roles from the custom ones', () => {
    const groups = groupRoles(
      [role('fijo', 'fixed'), role('propio', 'custom')],
      false,
    );

    expect(groups.map((group) => group.name)).toEqual([
      'Roles del sistema',
      'Roles propios',
    ]);
  });

  it('drops the groups that have no roles', () => {
    expect(groupRoles([role('fijo', 'fixed')], false)).toHaveLength(1);
    expect(groupRoles([], true)).toEqual([]);
  });

  it('gives each producer its own group when asked by producer, in name order', () => {
    const groups = groupRoles(
      [
        role('r1', 'custom', 'Beto'),
        role('r2', 'custom', 'Ana'),
        role('r3', 'custom', 'Ana'),
      ],
      true,
    );

    expect(groups.map((group) => group.name)).toEqual([
      'Roles propios de Ana Prueba · PROD-Ana',
      'Roles propios de Beto Prueba · PROD-Beto',
    ]);
    expect(groups[0].items).toHaveLength(2);
  });
});
