import { describe, expect, it } from 'vitest';

import { clearOfflineCache, getOfflineDb } from './db';

function randomUserId() {
  return `test-${Math.random().toString(36).slice(2)}`;
}

describe('getOfflineDb', () => {
  it('gives each user a separate database', async () => {
    const userA = randomUserId();
    const userB = randomUserId();

    await getOfflineDb(userA).cache.put({
      key: 'farms:1',
      value: { name: 'Finca A' },
      fetchedAt: Date.now(),
    });

    expect(await getOfflineDb(userB).cache.toArray()).toHaveLength(0);
    expect(await getOfflineDb(userA).cache.toArray()).toHaveLength(1);
  });

  it('returns the same instance for the same user', () => {
    const userId = randomUserId();
    expect(getOfflineDb(userId)).toBe(getOfflineDb(userId));
  });
});

describe('clearOfflineCache', () => {
  it('clears only the cache table, keeping the queue', async () => {
    const userId = randomUserId();
    const db = getOfflineDb(userId);
    await db.cache.put({ key: 'farms:1', value: {}, fetchedAt: Date.now() });
    await db.queue.add({
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await clearOfflineCache(userId);

    expect(await db.cache.toArray()).toHaveLength(0);
    expect(await db.queue.toArray()).toHaveLength(1);
  });
});
