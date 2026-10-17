import { describe, expect, it } from 'vitest';

import { PERMISSIONS, hasPermission, isFieldPermission } from './permissions';

describe('hasPermission', () => {
  it('is true when the user has the permission', () => {
    const user = { permissions: [PERMISSIONS.PRODUCERS_VIEW] };

    expect(hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)).toBe(true);
  });

  it('is false when the user lacks the permission', () => {
    const user = { permissions: ['accounts.users_view'] };

    expect(hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
  });

  it('is false while the session is not loaded', () => {
    expect(hasPermission(undefined, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
    expect(hasPermission(null, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
  });

  it('is false when the session carries no permission list', () => {
    expect(hasPermission({}, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
  });
});

describe('isFieldPermission', () => {
  it('counts what hangs from a farm', () => {
    expect(isFieldPermission(PERMISSIONS.ACTIVITIES_COMPLETE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.CROPS_CHARACTERIZE)).toBe(true);
  });

  // Los catálogos son de toda la asociación: quien los administra no necesita una finca.
  it('leaves out the association catalogs', () => {
    expect(isFieldPermission(PERMISSIONS.CROPS_MANAGE_VARIETIES)).toBe(false);
    expect(isFieldPermission(PERMISSIONS.HEALTH_MANAGE_PEST_DISEASE)).toBe(
      false,
    );
  });
});
