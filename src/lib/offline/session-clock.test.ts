import { describe, expect, it } from 'vitest';

import {
  isOrphaned,
  isWithinOfflineWindow,
  recordLogin,
} from './session-clock';

function randomUserId() {
  return `test-${Math.random().toString(36).slice(2)}`;
}

describe('session clock', () => {
  it('is false before any login was recorded', async () => {
    const userId = randomUserId();

    expect(await isWithinOfflineWindow(userId)).toBe(false);
    expect(await isOrphaned(userId)).toBe(false);
  });

  it('stays within the offline window for 7 days and expires after', async () => {
    const userId = randomUserId();
    const loginAt = new Date('2026-09-01T08:00:00Z').getTime();
    await recordLogin(userId, loginAt);

    const sixDaysLater = loginAt + 6 * 24 * 60 * 60 * 1000;
    const eightDaysLater = loginAt + 8 * 24 * 60 * 60 * 1000;

    expect(await isWithinOfflineWindow(userId, sixDaysLater)).toBe(true);
    expect(await isWithinOfflineWindow(userId, eightDaysLater)).toBe(false);
  });

  it('is orphaned only after 30 days without a new login', async () => {
    const userId = randomUserId();
    const loginAt = new Date('2026-09-01T08:00:00Z').getTime();
    await recordLogin(userId, loginAt);

    const twentyNineDaysLater = loginAt + 29 * 24 * 60 * 60 * 1000;
    const thirtyOneDaysLater = loginAt + 31 * 24 * 60 * 60 * 1000;

    expect(await isOrphaned(userId, twentyNineDaysLater)).toBe(false);
    expect(await isOrphaned(userId, thirtyOneDaysLater)).toBe(true);
  });
});
