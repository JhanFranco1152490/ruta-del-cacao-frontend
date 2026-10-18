import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from '@/lib/offline/adapters';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import { characterizationQueueId } from '@/lib/offline/queue-ids';
import {
  clearAdapters,
  enqueue,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';

import {
  enqueueHarvest,
  getQueuedHarvest,
  HARVEST_RESOURCE,
  type HarvestPayload,
  harvestQueueId,
  listQueuedHarvests,
  resubmitHarvest,
} from './harvest-queue';

const payload: HarvestPayload = {
  request: {
    id: 'h1',
    plot_id: 'pl1',
    harvest_date: '2026-10-14',
    green_weight_kg: '120.5',
    variety_id: 'v1',
    collector_id: 'u1',
  },
  label: 'P05 · Lote del río · 14 oct.',
};

let userId: string;

beforeEach(() => {
  userId = `harvest-queue-${crypto.randomUUID()}`;
});

describe('enqueueHarvest', () => {
  it('saves the harvest under its own key, waiting for the characterization of its plot', async () => {
    await enqueueHarvest(userId, payload);

    expect(
      await getOfflineDb(userId).queue.get(harvestQueueId('h1')),
    ).toMatchObject({
      id: 'harvest:h1',
      resource: HARVEST_RESOURCE,
      operation: 'create',
      parentId: characterizationQueueId('pl1'),
      status: 'pending',
      payload,
    });
  });

  it('does not duplicate it when the same form is saved twice', async () => {
    await enqueueHarvest(userId, payload);
    await enqueueHarvest(userId, payload);

    expect(await listQueuedHarvests(userId)).toHaveLength(1);
  });
});

describe('reading and correcting what waits on the device', () => {
  it('reads one harvest and lists them all', async () => {
    await enqueueHarvest(userId, payload);
    await enqueueHarvest(userId, {
      ...payload,
      request: { ...payload.request, id: 'h2' },
    });

    expect(await getQueuedHarvest(userId, 'h1')).toMatchObject({
      id: 'h1',
      label: payload.label,
      status: 'pending',
    });
    expect((await listQueuedHarvests(userId)).map(({ id }) => id)).toEqual([
      'h1',
      'h2',
    ]);
  });

  it('knows nothing of a record of another resource', async () => {
    await enqueue(userId, {
      id: harvestQueueId('h1'),
      resource: 'otro',
      operation: 'create',
      payload: {},
    });

    expect(await getQueuedHarvest(userId, 'h1')).toBeNull();
  });

  it('replaces what was captured and returns it to pending', async () => {
    await enqueueHarvest(userId, payload);
    await getOfflineDb(userId).queue.update(harvestQueueId('h1'), {
      status: 'error',
      errorCode: 'variety_not_in_plot',
    });

    await resubmitHarvest(userId, {
      ...payload,
      request: { ...payload.request, variety_id: 'v2' },
    });

    expect(await getQueuedHarvest(userId, 'h1')).toMatchObject({
      status: 'pending',
      errorCode: undefined,
      request: { variety_id: 'v2' },
    });
  });
});

describe('the order the queue sends in', () => {
  const sent: string[] = [];
  const recording = (resource: string): SyncAdapter => ({
    resource,
    send: vi.fn(async (item: QueueItem) => {
      sent.push(item.id);
    }),
    parseConflict: () => null,
  });

  beforeEach(() => {
    sent.length = 0;
    clearAdapters();
    registerAdapter(recording('plots'));
    registerAdapter(recording('plot-characterizations'));
    registerAdapter(recording(HARVEST_RESOURCE));
  });

  afterEach(() => clearAdapters());

  const queuePlotAndCharacterization = async () => {
    await enqueue(userId, {
      id: 'pl1',
      resource: 'plots',
      operation: 'create',
      payload: {},
    });
    await enqueue(userId, {
      id: characterizationQueueId('pl1'),
      resource: 'plot-characterizations',
      operation: 'update',
      parentId: 'pl1',
      payload: {},
    });
  };

  it('sends the plot, then its characterization, then the harvest, all created offline', async () => {
    await queuePlotAndCharacterization();
    await enqueueHarvest(userId, payload);

    await processQueue(userId);

    expect(sent).toEqual(['pl1', characterizationQueueId('pl1'), 'harvest:h1']);
  });

  it('holds the harvest while the characterization waits in the tray with an error', async () => {
    await queuePlotAndCharacterization();
    await getOfflineDb(userId).queue.update(characterizationQueueId('pl1'), {
      status: 'error',
    });
    await enqueueHarvest(userId, payload);

    await processQueue(userId);

    expect(sent).toEqual(['pl1']);
    expect(await getQueuedHarvest(userId, 'h1')).toMatchObject({
      status: 'pending',
    });
  });

  it('sends the harvest right away when its plot and characterization are already on the server', async () => {
    await enqueueHarvest(userId, payload);

    await processQueue(userId);

    expect(sent).toEqual(['harvest:h1']);
  });
});
