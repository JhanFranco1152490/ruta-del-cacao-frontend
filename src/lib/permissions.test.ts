import { describe, expect, it } from 'vitest';

import { PERMISSIONS, hasPermission } from './permissions';

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
