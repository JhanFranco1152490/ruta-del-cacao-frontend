import { describe, expect, it } from 'vitest';

import { receivesNotifications } from './notification-access';
import { PERMISSIONS } from './permissions';

const account = (...permissions: string[]) => ({
  producer_id: 'p-1',
  permissions,
});

describe('receivesNotifications', () => {
  it('reaches whoever sees activities', () => {
    expect(receivesNotifications(account(PERMISSIONS.ACTIVITIES_VIEW))).toBe(
      true,
    );
  });

  it('reaches whoever sees lots, even without activities', () => {
    expect(receivesNotifications(account(PERMISSIONS.LOTS_VIEW))).toBe(true);
  });

  it('does not reach an account that sees neither', () => {
    expect(receivesNotifications(account(PERMISSIONS.HARVESTS_VIEW))).toBe(
      false,
    );
    expect(receivesNotifications(account())).toBe(false);
  });

  it('does not reach an account without a producer', () => {
    expect(
      receivesNotifications({
        producer_id: null,
        permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.LOTS_VIEW],
      }),
    ).toBe(false);
  });

  it('does not reach a missing session', () => {
    expect(receivesNotifications(undefined)).toBe(false);
    expect(receivesNotifications(null)).toBe(false);
  });
});
