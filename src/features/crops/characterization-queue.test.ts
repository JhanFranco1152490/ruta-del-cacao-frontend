import { beforeEach, describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import {
  discard,
  enqueue,
  QueueItemExistsError,
  QueueItemHasDependentsError,
} from '@/lib/offline/sync-queue';

import {
  CHARACTERIZATION_RESOURCE,
  characterizationQueueId,
  enqueueCharacterization,
  getQueuedCharacterization,
  listQueuedCharacterizations,
  resubmitCharacterization,
} from './characterization-queue';
import type { CharacterizationFormFields } from './schemas';

const fields: CharacterizationFormFields = {
  plantings: [
    { variety_id: 'ccn-51', planting_date: '2021-03', tree_count: 1800 },
    { variety_id: 'ics-95', planting_date: '2023-08', tree_count: 600 },
  ],
  stage: 'full_production',
  management_system: 'conventional',
  shade_type: null,
};

const CAPTURED_AT = '2026-10-03T14:10:00.000Z';

let userId: string;

beforeEach(() => {
  userId = `characterization-queue-${crypto.randomUUID()}`;
});

// Una parcela pendiente en la cola, guardada con el id de la parcela como hace su dominio.
const enqueuePlot = (plotId: string) =>
  enqueue(userId, {
    id: plotId,
    resource: 'plots',
    operation: 'create',
    parentId: 'farm-1',
    payload: {},
  });

describe('enqueueCharacterization', () => {
  it('saves the PUT body under its own key, with the plot as parent', async () => {
    await enqueueCharacterization(userId, 'plot-1', fields, null, CAPTURED_AT);

    const item = await getOfflineDb(userId).queue.get(
      characterizationQueueId('plot-1'),
    );
    expect(item).toMatchObject({
      resource: CHARACTERIZATION_RESOURCE,
      operation: 'update',
      parentId: 'plot-1',
      status: 'pending',
      payload: { ...fields, expected_version: null, captured_at: CAPTURED_AT },
    });
  });

  it('does not overwrite the pending plot it belongs to', async () => {
    await enqueuePlot('plot-1');
    await enqueueCharacterization(userId, 'plot-1', fields, null, CAPTURED_AT);

    const queue = getOfflineDb(userId).queue;
    expect((await queue.get('plot-1'))?.resource).toBe('plots');
    expect(await queue.count()).toBe(2);
  });

  it('rejects a second characterization of the same plot', async () => {
    await enqueueCharacterization(userId, 'plot-1', fields, 2);

    await expect(
      enqueueCharacterization(userId, 'plot-1', fields, 2),
    ).rejects.toBeInstanceOf(QueueItemExistsError);
  });

  it('blocks discarding a pending plot that has a pending characterization', async () => {
    await enqueuePlot('plot-1');
    await enqueueCharacterization(userId, 'plot-1', fields, null);

    await expect(discard(userId, 'plot-1')).rejects.toBeInstanceOf(
      QueueItemHasDependentsError,
    );
  });
});

describe('getQueuedCharacterization', () => {
  it('reads the form fields and the version back', async () => {
    await enqueueCharacterization(userId, 'plot-1', fields, 3, CAPTURED_AT);

    expect(await getQueuedCharacterization(userId, 'plot-1')).toEqual({
      plotId: 'plot-1',
      fields,
      expectedVersion: 3,
      status: 'pending',
      errorCode: undefined,
      errorMessage: undefined,
      errorData: undefined,
    });
  });

  it('is null when the plot has nothing waiting', async () => {
    await enqueuePlot('plot-1');

    expect(await getQueuedCharacterization(userId, 'plot-1')).toBeNull();
  });
});

describe('listQueuedCharacterizations', () => {
  it('returns only the characterizations of the plots asked for', async () => {
    await enqueuePlot('plot-1');
    await enqueueCharacterization(userId, 'plot-1', fields, null);
    await enqueueCharacterization(userId, 'plot-2', fields, 1);
    await enqueueCharacterization(userId, 'plot-9', fields, 1);

    const queued = await listQueuedCharacterizations(userId, [
      'plot-1',
      'plot-2',
    ]);

    expect(queued.map((item) => item.plotId).sort()).toEqual([
      'plot-1',
      'plot-2',
    ]);
  });

  it('returns nothing for no plots', async () => {
    await enqueueCharacterization(userId, 'plot-1', fields, null);

    expect(await listQueuedCharacterizations(userId, [])).toEqual([]);
  });
});

describe('resubmitCharacterization', () => {
  it('replaces the pending fields and keeps the version that was read', async () => {
    await enqueueCharacterization(userId, 'plot-1', fields, 2);
    const queued = (await getQueuedCharacterization(userId, 'plot-1'))!;

    await resubmitCharacterization(userId, queued, {
      ...fields,
      stage: 'renovation',
    });

    expect(await getQueuedCharacterization(userId, 'plot-1')).toMatchObject({
      fields: { stage: 'renovation' },
      expectedVersion: 2,
      status: 'pending',
    });
  });

  it('takes the current version after reviewing a stale one, and clears the error', async () => {
    await enqueueCharacterization(userId, 'plot-1', fields, 2);
    await getOfflineDb(userId).queue.update(characterizationQueueId('plot-1'), {
      status: 'error',
      errorCode: 'stale_version',
      errorMessage: 'La ficha cambió en el servidor.',
    });
    const queued = (await getQueuedCharacterization(userId, 'plot-1'))!;

    await resubmitCharacterization(userId, queued, fields, 4);

    expect(await getQueuedCharacterization(userId, 'plot-1')).toMatchObject({
      expectedVersion: 4,
      status: 'pending',
      errorCode: undefined,
    });
  });
});
