import { beforeEach, describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { enqueue, QueueItemExistsError } from '@/lib/offline/sync-queue';

import {
  COMPLETION_RESOURCE,
  type CompletionPayload,
  completionQueueId,
  enqueueCompletion,
  getQueuedCompletion,
  listQueuedCompletions,
  resubmitCompletion,
} from './completion-queue';

const payload: CompletionPayload = {
  request: {
    done_date: '2026-10-19',
    inputs: [{ input_id: 'in1', quantity: '100' }],
    captured_at: '2026-10-19T21:42:00.000Z',
  },
  label: 'Fertilización · P03',
};

let userId: string;

beforeEach(() => {
  userId = `completion-queue-${crypto.randomUUID()}`;
});

describe('enqueueCompletion', () => {
  it('saves the completion under its own key, with the activity as parent', async () => {
    await enqueueCompletion(userId, 'a1', payload);

    expect(
      await getOfflineDb(userId).queue.get(completionQueueId('a1')),
    ).toMatchObject({
      id: 'activity-completion:a1',
      resource: COMPLETION_RESOURCE,
      parentId: 'a1',
      status: 'pending',
      payload,
    });
  });

  it('rejects a second completion of the same activity instead of losing one', async () => {
    await enqueueCompletion(userId, 'a1', payload);

    await expect(
      enqueueCompletion(userId, 'a1', {
        ...payload,
        request: { done_date: '2026-10-20', inputs: [] },
      }),
    ).rejects.toBeInstanceOf(QueueItemExistsError);
    expect((await getQueuedCompletion(userId, 'a1'))?.request.done_date).toBe(
      '2026-10-19',
    );
  });

  it('keeps the completions of different activities apart', async () => {
    await enqueueCompletion(userId, 'a1', payload);
    await enqueueCompletion(userId, 'a2', { ...payload, label: 'Poda · P-01' });

    expect(
      (await listQueuedCompletions(userId)).map(({ activityId, label }) => [
        activityId,
        label,
      ]),
    ).toEqual([
      ['a1', 'Fertilización · P03'],
      ['a2', 'Poda · P-01'],
    ]);
  });
});

describe('getQueuedCompletion', () => {
  it('reads what was captured and what happened to it', async () => {
    await enqueueCompletion(userId, 'a1', payload);
    await getOfflineDb(userId).queue.update(completionQueueId('a1'), {
      status: 'error',
      errorCode: 'input_inactive',
      errorMessage: 'Este insumo ya no está disponible.',
      errorData: { input_ids: ['in1'] },
    });

    expect(await getQueuedCompletion(userId, 'a1')).toEqual({
      activityId: 'a1',
      request: payload.request,
      label: 'Fertilización · P03',
      status: 'error',
      errorCode: 'input_inactive',
      errorMessage: 'Este insumo ya no está disponible.',
      errorData: { input_ids: ['in1'] },
    });
  });

  it('is empty when the activity has nothing waiting', async () => {
    expect(await getQueuedCompletion(userId, 'a1')).toBeNull();
  });

  it('ignores a record of another resource', async () => {
    await enqueue(userId, {
      id: completionQueueId('a1'),
      resource: 'plots',
      operation: 'create',
      payload: {},
    });

    expect(await getQueuedCompletion(userId, 'a1')).toBeNull();
    expect(await listQueuedCompletions(userId)).toEqual([]);
  });
});

describe('resubmitCompletion', () => {
  it('replaces what was captured and sends it back to pending without its error', async () => {
    await enqueueCompletion(userId, 'a1', payload);
    await getOfflineDb(userId).queue.update(completionQueueId('a1'), {
      status: 'error',
      errorCode: 'input_inactive',
      errorMessage: 'Este insumo ya no está disponible.',
    });

    await resubmitCompletion(userId, 'a1', {
      ...payload,
      request: {
        ...payload.request,
        inputs: [{ input_id: 'in2', quantity: '5' }],
      },
    });

    const queued = await getQueuedCompletion(userId, 'a1');
    expect(queued).toMatchObject({
      status: 'pending',
      request: { inputs: [{ input_id: 'in2', quantity: '5' }] },
    });
    expect(queued?.errorCode).toBeUndefined();
    expect(queued?.errorMessage).toBeUndefined();
  });
});
