import { describe, expect, it } from 'vitest';

import { mayRecordFor } from './activity-recorders';
import { PERMISSIONS } from './permissions';

const operator = {
  id: 'u1',
  permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_COMPLETE],
  all_farms: false,
};

describe('mayRecordFor', () => {
  it('lets a worker record only what is assigned to it', () => {
    expect(mayRecordFor(operator, 'u1')).toBe(true);
    expect(mayRecordFor(operator, 'u2')).toBe(false);
  });

  it('lets whoever schedules record what is assigned to others', () => {
    const foreman = {
      ...operator,
      permissions: [...operator.permissions, PERMISSIONS.ACTIVITIES_ADD],
    };
    expect(mayRecordFor(foreman, 'u2')).toBe(true);
  });

  it('lets who reaches every farm record what is assigned to others', () => {
    expect(mayRecordFor({ ...operator, all_farms: true }, 'u2')).toBe(true);
  });

  it('does not take a missing assignee for the own account', () => {
    expect(mayRecordFor({ ...operator, id: undefined }, undefined)).toBe(false);
  });

  it('lets nobody record while the session is not loaded', () => {
    expect(mayRecordFor(undefined, 'u1')).toBe(false);
    expect(mayRecordFor(null, 'u1')).toBe(false);
  });
});
