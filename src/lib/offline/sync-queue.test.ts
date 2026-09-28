import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from './adapters';
import { getOfflineDb, type QueueItem } from './db';
import {
  clearAdapters,
  enqueue,
  processQueue,
  registerAdapter,
} from './sync-queue';

function randomUserId() {
  return `test-${Math.random().toString(36).slice(2)}`;
}

function fakeAdapter(overrides: Partial<SyncAdapter> = {}): SyncAdapter {
  return {
    resource: 'farms',
    send: vi.fn().mockResolvedValue(undefined),
    parseConflict: () => null,
    ...overrides,
  };
}

afterEach(() => {
  clearAdapters();
});

describe('enqueue', () => {
  it('does not duplicate an item with the same id', async () => {
    const userId = randomUserId();
    const input = {
      id: 'a1',
      resource: 'farms',
      operation: 'create' as const,
      payload: {},
    };

    await enqueue(userId, input);
    await enqueue(userId, input);

    expect(await getOfflineDb(userId).queue.toArray()).toHaveLength(1);
  });
});

describe('processQueue', () => {
  it('sends a pending item and removes it from the queue once synced', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter();
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(adapter.send).toHaveBeenCalledTimes(1);
    expect(await getOfflineDb(userId).queue.get('a1')).toBeUndefined();
  });

  it('treats a child as ready when its parent already left the queue synced', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter();
    registerAdapter(adapter);
    // El padre nunca se encoló en este dispositivo (por ejemplo, ya existía en el servidor):
    // no aparece en la cola, así que no puede bloquear a su hijo para siempre.
    await enqueue(userId, {
      id: 'child',
      resource: 'farms',
      operation: 'create',
      parentId: 'parent-not-in-queue',
      payload: {},
    });

    await processQueue(userId);

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate the request when a resource has no adapter yet', async () => {
    const userId = randomUserId();
    await enqueue(userId, {
      id: 'a1',
      resource: 'unknown',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect((await getOfflineDb(userId).queue.get('a1'))?.status).toBe(
      'pending',
    );
  });

  it('processes a parent before its child even if the child was enqueued first', async () => {
    const userId = randomUserId();
    const order: string[] = [];
    const adapter = fakeAdapter({
      send: vi.fn(async (item: QueueItem) => {
        order.push(item.id);
      }),
    });
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'child',
      resource: 'farms',
      operation: 'create',
      parentId: 'parent',
      payload: {},
    });
    await enqueue(userId, {
      id: 'parent',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(order).toEqual(['parent', 'child']);
  });

  it('leaves the child pending, without discarding it, when the parent fails', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter({
      send: vi.fn(async (item: QueueItem) => {
        if (item.id === 'parent') throw new TypeError('Failed to fetch');
      }),
    });
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'child',
      resource: 'farms',
      operation: 'create',
      parentId: 'parent',
      payload: {},
    });
    await enqueue(userId, {
      id: 'parent',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    const db = getOfflineDb(userId);
    expect((await db.queue.get('parent'))?.status).toBe('pending');
    expect((await db.queue.get('child'))?.status).toBe('pending');
    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('retries a network error on the next call instead of moving it to the error tray', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter({
      send: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect((await getOfflineDb(userId).queue.get('a1'))?.status).toBe(
      'pending',
    );
    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('moves a conflict to the error tray without discarding it', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter({
      send: vi.fn().mockRejectedValue(new Error('stale')),
      parseConflict: () => ({
        code: 'stale_version',
        message: 'Alguien más lo editó.',
      }),
    });
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(await getOfflineDb(userId).queue.get('a1')).toMatchObject({
      status: 'error',
      errorCode: 'stale_version',
      errorMessage: 'Alguien más lo editó.',
    });
  });

  it('does not send the same item twice when called concurrently for the same user', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter();
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await Promise.all([processQueue(userId), processQueue(userId)]);

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('resumes an item left syncing by a call that never finished', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter();
    registerAdapter(adapter);
    // Simula una pestaña que se cerró (o se quedó sin batería) a mitad del envío: el item
    // queda marcado `syncing` sin que ninguna llamada a processQueue lo esté procesando.
    await getOfflineDb(userId).queue.add({
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'syncing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await processQueue(userId);

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('treats a parseConflict that throws as a retryable error, not a conflict', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter({
      send: vi.fn().mockRejectedValue(new Error('unexpected')),
      parseConflict: vi.fn(() => {
        throw new Error('bug in the adapter');
      }),
    });
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect((await getOfflineDb(userId).queue.get('a1'))?.status).toBe(
      'pending',
    );
  });
});
