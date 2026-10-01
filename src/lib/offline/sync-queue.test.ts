import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from './adapters';
import { getOfflineDb, type QueueItem } from './db';
import {
  clearAdapters,
  discard,
  enqueue,
  processQueue,
  QueueItemBusyError,
  QueueItemExistsError,
  QueueItemHasDependentsError,
  QueueItemMissingError,
  registerAdapter,
  resubmit,
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

  it('can refuse an id already in the queue instead of keeping the old item silently', async () => {
    const userId = randomUserId();
    const input = {
      id: 'a1',
      resource: 'farms',
      operation: 'update' as const,
      payload: { name: 'Primera' },
    };
    await enqueue(userId, input);

    await expect(
      enqueue(
        userId,
        { ...input, payload: { name: 'Segunda' } },
        { rejectExisting: true },
      ),
    ).rejects.toBeInstanceOf(QueueItemExistsError);
    expect(await getOfflineDb(userId).queue.get('a1')).toMatchObject({
      payload: { name: 'Primera' },
    });
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

  it('sends a correction made after the queue was read but before sending', async () => {
    const userId = randomUserId();
    const sent: unknown[] = [];
    // El envío del primero corrige al segundo, que ya estaba en la lista leída.
    const adapter = fakeAdapter({
      send: vi.fn(async (item: QueueItem) => {
        sent.push(item.payload);
        if (item.id === 'a1') await resubmit(userId, 'a2', { name: 'Nuevo' });
      }),
    });
    registerAdapter(adapter);
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });
    await enqueue(userId, {
      id: 'a2',
      resource: 'farms',
      operation: 'create',
      payload: { name: 'Viejo' },
    });

    await processQueue(userId);

    expect(sent).toEqual([{}, { name: 'Nuevo' }]);
  });
});

async function enqueueFailed(userId: string, id = 'a1') {
  await enqueue(userId, {
    id,
    resource: 'farms',
    operation: 'create',
    payload: { name: 'Viejo' },
  });
  await getOfflineDb(userId).queue.update(id, {
    status: 'error',
    errorCode: 'duplicate_farm_name',
    errorMessage: 'Ya existe una finca con este nombre.',
  });
}

describe('resubmit', () => {
  it('replaces the content, clears the error and returns the item to pending', async () => {
    const userId = randomUserId();
    await enqueueFailed(userId);

    await resubmit(userId, 'a1', { name: 'Corregido' });

    const item = await getOfflineDb(userId).queue.get('a1');
    expect(item).toMatchObject({
      status: 'pending',
      payload: { name: 'Corregido' },
    });
    expect(item).not.toHaveProperty('errorCode');
    expect(item).not.toHaveProperty('errorMessage');
  });

  it('refuses to change an item that is being sent', async () => {
    const userId = randomUserId();
    await enqueueFailed(userId);
    await getOfflineDb(userId).queue.update('a1', { status: 'syncing' });

    await expect(resubmit(userId, 'a1', {})).rejects.toBeInstanceOf(
      QueueItemBusyError,
    );
    expect((await getOfflineDb(userId).queue.get('a1'))?.payload).toEqual({
      name: 'Viejo',
    });
  });

  it('reports an item that already left the queue', async () => {
    await expect(resubmit(randomUserId(), 'a1', {})).rejects.toBeInstanceOf(
      QueueItemMissingError,
    );
  });
});

describe('discard', () => {
  it('removes the item from the queue', async () => {
    const userId = randomUserId();
    await enqueueFailed(userId);

    await discard(userId, 'a1');

    expect(await getOfflineDb(userId).queue.get('a1')).toBeUndefined();
  });

  it('keeps an item that other queued items depend on', async () => {
    const userId = randomUserId();
    await enqueueFailed(userId);
    await enqueue(userId, {
      id: 'c1',
      resource: 'plots',
      operation: 'create',
      parentId: 'a1',
      payload: {},
    });

    await expect(discard(userId, 'a1')).rejects.toBeInstanceOf(
      QueueItemHasDependentsError,
    );
    expect(await getOfflineDb(userId).queue.get('a1')).toBeDefined();
  });

  it('refuses to discard an item that is being sent', async () => {
    const userId = randomUserId();
    await enqueueFailed(userId);
    await getOfflineDb(userId).queue.update('a1', { status: 'syncing' });

    await expect(discard(userId, 'a1')).rejects.toBeInstanceOf(
      QueueItemBusyError,
    );
  });

  it('does nothing when the item is already gone', async () => {
    await expect(discard(randomUserId(), 'a1')).resolves.toBeUndefined();
  });
});

describe('processQueue recovery', () => {
  it('retries a recovered item right away as its new operation', async () => {
    const userId = randomUserId();
    const sent: QueueItem[] = [];
    registerAdapter(
      fakeAdapter({
        send: vi.fn(async (item: QueueItem) => {
          sent.push(item);
          if (item.operation === 'create') throw new Error('ya existe');
        }),
        recover: (item) =>
          item.operation === 'create'
            ? { operation: 'update', payload: { cambiado: true } }
            : null,
      }),
    );
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(sent.map((item) => [item.operation, item.payload])).toEqual([
      ['create', {}],
      ['update', { cambiado: true }],
    ]);
    expect(await getOfflineDb(userId).queue.get('a1')).toBeUndefined();
  });

  it('recovers an item only once per call, then follows the normal path', async () => {
    const userId = randomUserId();
    const send = vi.fn().mockRejectedValue(new Error('sigue fallando'));
    registerAdapter(
      fakeAdapter({
        send,
        recover: () => ({ operation: 'update', payload: {} }),
        parseConflict: () => ({ code: 'conflict', message: 'No se pudo.' }),
      }),
    );
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(send).toHaveBeenCalledTimes(2);
    expect(await getOfflineDb(userId).queue.get('a1')).toMatchObject({
      operation: 'update',
      status: 'error',
      errorCode: 'conflict',
    });
  });

  it('treats a recover that throws as no recovery', async () => {
    const userId = randomUserId();
    registerAdapter(
      fakeAdapter({
        send: vi.fn().mockRejectedValue(new Error('sin red')),
        recover: () => {
          throw new Error('adapter roto');
        },
      }),
    );
    await enqueue(userId, {
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(await getOfflineDb(userId).queue.get('a1')).toMatchObject({
      operation: 'create',
      status: 'pending',
    });
  });
});
