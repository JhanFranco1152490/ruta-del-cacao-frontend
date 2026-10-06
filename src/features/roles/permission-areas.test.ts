import { describe, expect, it } from 'vitest';

import type { PermissionItem } from './api';
import { groupPermissionsByArea } from './permission-areas';

const permission = (code: string, area: string): PermissionItem => ({
  code,
  name: `Puede ${code}`,
  area,
  delegable: true,
  grantable: true,
  requires: null,
});

const labelsOf = (areas: string[]) =>
  groupPermissionsByArea(
    areas.map((area, index) => permission(`${area}.p${index}`, area)),
  ).map((group) => group.label);

describe('groupPermissionsByArea', () => {
  it('orders the sections the way the work flows, not alphabetically', () => {
    expect(
      labelsOf(['roles', 'users', 'crops', 'farms', 'plots', 'producers']),
    ).toEqual([
      'Productores',
      'Fincas',
      'Parcelas',
      'Caracterización de parcelas',
      'Cuentas',
      'Roles',
    ]);
  });

  it('puts an area it does not know after the known ones, by name', () => {
    expect(labelsOf(['zeta', 'roles', 'alfa', 'farms'])).toEqual([
      'Fincas',
      'Roles',
      'alfa',
      'zeta',
    ]);
  });

  it('keeps each permission in the order the server sent it, inside its section', () => {
    const groups = groupPermissionsByArea([
      permission('farms.b', 'farms'),
      permission('users.a', 'users'),
      permission('farms.a', 'farms'),
    ]);

    expect(groups[0].items.map((item) => item.code)).toEqual([
      'farms.b',
      'farms.a',
    ]);
  });

  it('is empty without permissions', () => {
    expect(groupPermissionsByArea([])).toEqual([]);
  });
});
