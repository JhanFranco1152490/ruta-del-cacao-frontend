import { afterEach, describe, expect, it, vi } from 'vitest';

import { runOfflineBootstrap } from './bootstrap';
import { getOfflineDb } from './db';
import { recordLogin } from './session-clock';
import { clearAdapters, registerAdapter } from './sync-queue';

function randomUserId() {
  return `test-${Math.random().toString(36).slice(2)}`;
}

afterEach(() => clearAdapters());

describe('runOfflineBootstrap', () => {
  it('processes the pending queue for an active session', async () => {
    const userId = randomUserId();
    await recordLogin(userId);
    const send = vi.fn().mockResolvedValue(undefined);
    registerAdapter({ resource: 'farms', send, parseConflict: () => null });
    await getOfflineDb(userId).queue.add({
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await runOfflineBootstrap(userId);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('purges the queue of a session orphaned for more than 30 days', async () => {
    const userId = randomUserId();
    const longAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await recordLogin(userId, longAgo);
    await getOfflineDb(userId).queue.add({
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'pending',
      createdAt: longAgo,
      updatedAt: longAgo,
    });

    await runOfflineBootstrap(userId);

    expect(await getOfflineDb(userId).queue.toArray()).toHaveLength(0);
  });
});
