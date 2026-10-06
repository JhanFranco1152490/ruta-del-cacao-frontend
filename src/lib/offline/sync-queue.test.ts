import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';

import type { SyncAdapter } from './adapters';
import { getOfflineDb, type QueueItem } from './db';
import {
  clearAdapters,
  discard,
  enqueue,
  onItemSynced,
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
  sessionStorage.clear();
  syncActingProducer(null);
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

describe('enqueue and the acting producer', () => {
  const CHOSEN = '33333333-3333-4333-8333-333333333333';
  const OTHER = '44444444-4444-4444-8444-444444444444';
  const input = (id: string, parentId?: string) => ({
    id,
    resource: 'farms',
    operation: 'create' as const,
    parentId,
    payload: {},
  });

  it('saves the producer the tab is acting under with the record', async () => {
    const userId = randomUserId();
    writeActingProducer(userId, CHOSEN);

    const item = await enqueue(userId, input('a1'));

    expect(item.actingProducerId).toBe(CHOSEN);
  });

  it('saves none when the tab is not acting under a producer', async () => {
    const item = await enqueue(randomUserId(), input('a1'));

    expect(item.actingProducerId).toBeUndefined();
  });

  it('keeps the producer of the record when it is queued again after a change', async () => {
    const userId = randomUserId();
    writeActingProducer(userId, CHOSEN);
    await enqueue(userId, input('a1'));
    writeActingProducer(userId, OTHER);

    const again = await enqueue(userId, input('a1'));

    expect(again.actingProducerId).toBe(CHOSEN);
  });

  it('gives a child the producer of its queued parent, not the one of the tab', async () => {
    const userId = randomUserId();
    writeActingProducer(userId, CHOSEN);
    await enqueue(userId, input('farm-1'));
    writeActingProducer(userId, OTHER);

    const child = await enqueue(userId, input('plot-1', 'farm-1'));

    expect(child.actingProducerId).toBe(CHOSEN);
  });

  it('uses the producer of the tab for a child whose parent is already on the server', async () => {
    const userId = randomUserId();
    writeActingProducer(userId, OTHER);

    const child = await enqueue(userId, input('plot-1', 'farm-on-server'));

    expect(child.actingProducerId).toBe(OTHER);
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
        data: { current: { version: 3 } },
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
      errorData: { current: { version: 3 } },
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
    errorData: { hint: 'x' },
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
    expect(item).not.toHaveProperty('errorData');
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

describe('onItemSynced', () => {
  const enqueueFarm = (userId: string, id: string) =>
    enqueue(userId, {
      id,
      resource: 'farms',
      operation: 'create',
      payload: {},
    });

  it('tells about each record that reached the server, with its adapter', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter();
    registerAdapter(adapter);
    await enqueueFarm(userId, 'a1');
    const listener = vi.fn();
    const stop = onItemSynced(listener);

    await processQueue(userId);
    stop();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', resource: 'farms' }),
      adapter,
    );
  });

  it('does not tell about a record that did not reach the server', async () => {
    const userId = randomUserId();
    registerAdapter(
      fakeAdapter({ send: vi.fn().mockRejectedValue(new Error('sin red')) }),
    );
    await enqueueFarm(userId, 'a1');
    const listener = vi.fn();
    const stop = onItemSynced(listener);

    await processQueue(userId);
    stop();

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps sending the queue when a listener fails', async () => {
    const userId = randomUserId();
    const adapter = fakeAdapter();
    registerAdapter(adapter);
    await enqueueFarm(userId, 'a1');
    await enqueueFarm(userId, 'a2');
    const stop = onItemSynced(() => {
      throw new Error('falla del que escucha');
    });

    await processQueue(userId);
    stop();

    expect(adapter.send).toHaveBeenCalledTimes(2);
    expect(await getOfflineDb(userId).queue.toArray()).toEqual([]);
  });

  it('stops telling once the listener leaves', async () => {
    const userId = randomUserId();
    registerAdapter(fakeAdapter());
    await enqueueFarm(userId, 'a1');
    const listener = vi.fn();
    onItemSynced(listener)();

    await processQueue(userId);

    expect(listener).not.toHaveBeenCalled();
  });
});
