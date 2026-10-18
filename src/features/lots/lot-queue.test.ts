import { beforeEach, describe, expect, it } from 'vitest';

import type { SyncAdapter } from '@/lib/offline/adapters';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import {
  clearAdapters,
  enqueue,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';

import {
  enqueueLot,
  listQueuedLots,
  LOT_RESOURCE,
  type LotPayload,
  lotQueueId,
  queuedLotOf,
} from './lot-queue';

const payload: LotPayload = {
  request: { id: 'l1', harvest_id: 'h1' },
  label: 'Lote de P05 · Lote del río · 14 oct.',
};

let userId: string;

beforeEach(() => {
  userId = `lot-queue-${crypto.randomUUID()}`;
  clearAdapters();
});

describe('enqueueLot', () => {
  it('saves the lot under its own key, waiting for its harvest', async () => {
    await enqueueLot(userId, payload);

    expect(
      await getOfflineDb(userId).queue.get(lotQueueId('l1')),
    ).toMatchObject({
      id: 'lot:l1',
      resource: LOT_RESOURCE,
      operation: 'create',
      parentId: 'harvest:h1',
      status: 'pending',
      payload,
    });
  });

  it('keeps a single record when the same lot is queued twice', async () => {
    await enqueueLot(userId, payload);
    await enqueueLot(userId, payload);

    expect(await listQueuedLots(userId)).toHaveLength(1);
  });

  it('reads back what was queued', async () => {
    await enqueueLot(userId, payload);

    expect(await listQueuedLots(userId)).toEqual([
      {
        id: 'l1',
        harvestId: 'h1',
        label: 'Lote de P05 · Lote del río · 14 oct.',
        status: 'pending',
        errorCode: undefined,
        errorMessage: undefined,
      },
    ]);
  });

  it('only lists lots, not the other records of the queue', async () => {
    await enqueue(userId, {
      id: 'harvest:h1',
      resource: 'harvests',
      operation: 'create',
      payload: {},
    });

    expect(await listQueuedLots(userId)).toEqual([]);
  });
});

describe('queuedLotOf', () => {
  it('carries the reason the server gave when it was rejected', () => {
    const item: QueueItem = {
      id: 'lot:l1',
      resource: LOT_RESOURCE,
      operation: 'create',
      parentId: 'harvest:h1',
      payload,
      status: 'error',
      errorCode: 'harvest_already_in_lot',
      errorMessage: 'Esta cosecha ya forma otro lote.',
      createdAt: 1,
      updatedAt: 1,
    };

    expect(queuedLotOf(item)).toMatchObject({
      status: 'error',
      errorCode: 'harvest_already_in_lot',
      errorMessage: 'Esta cosecha ya forma otro lote.',
    });
  });
});

describe('the order of the queue', () => {
  const sent: string[] = [];
  const adapter = (resource: string): SyncAdapter => ({
    resource,
    send: async (item) => {
      sent.push(item.id);
    },
    parseConflict: () => null,
  });

  it('sends the harvest first and the lot after it, even if the lot was queued sooner', async () => {
    sent.length = 0;
    registerAdapter(adapter('harvests'));
    registerAdapter(adapter(LOT_RESOURCE));
    await enqueueLot(userId, payload);
    await enqueue(userId, {
      id: 'harvest:h1',
      resource: 'harvests',
      operation: 'create',
      payload: {},
    });

    await processQueue(userId);

    expect(sent).toEqual(['harvest:h1', 'lot:l1']);
  });

  it('keeps the lot waiting while its harvest is rejected', async () => {
    sent.length = 0;
    registerAdapter({
      ...adapter('harvests'),
      send: async () => {
        throw new Error('rechazada');
      },
      parseConflict: () => ({ code: 'validation_error', message: 'No.' }),
    });
    registerAdapter(adapter(LOT_RESOURCE));
    await enqueue(userId, {
      id: 'harvest:h1',
      resource: 'harvests',
      operation: 'create',
      payload: {},
    });
    await enqueueLot(userId, payload);

    await processQueue(userId);

    expect(sent).toEqual([]);
    expect((await getOfflineDb(userId).queue.get('lot:l1'))?.status).toBe(
      'pending',
    );
  });
});
