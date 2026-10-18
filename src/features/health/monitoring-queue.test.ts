import { beforeEach, describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { QueueItemExistsError } from '@/lib/offline/sync-queue';

import {
  enqueueMonitoring,
  getQueuedMonitoring,
  MONITORING_RESOURCE,
  type MonitoringPayload,
  monitoringQueueId,
  resubmitMonitoring,
} from './monitoring-queue';

const payload: MonitoringPayload = {
  request: {
    done_date: '2026-10-19',
    sampling_unit: 'trees',
    evaluated_units: 50,
    no_presence: true,
    detections: [],
  },
  label: 'P-03 · 19 de octubre',
};

let userId: string;

beforeEach(() => {
  userId = `monitoring-queue-${crypto.randomUUID()}`;
});

describe('enqueueMonitoring', () => {
  it('saves the result under its own key, with the activity as parent', async () => {
    await enqueueMonitoring(userId, 'a1', payload);

    expect(
      await getOfflineDb(userId).queue.get(monitoringQueueId('a1')),
    ).toMatchObject({
      id: 'monitoring-result:a1',
      resource: MONITORING_RESOURCE,
      parentId: 'a1',
      status: 'pending',
      payload,
    });
  });

  it('rejects a second result of the same monitoring instead of losing one', async () => {
    await enqueueMonitoring(userId, 'a1', payload);

    await expect(
      enqueueMonitoring(userId, 'a1', {
        ...payload,
        request: { ...payload.request, evaluated_units: 80 },
      }),
    ).rejects.toBeInstanceOf(QueueItemExistsError);
    expect(
      (await getQueuedMonitoring(userId, 'a1'))?.request.evaluated_units,
    ).toBe(50);
  });
});

describe('getQueuedMonitoring', () => {
  it('reads what waits in the device, with the error the server gave', async () => {
    await enqueueMonitoring(userId, 'a1', payload);
    await getOfflineDb(userId).queue.update(monitoringQueueId('a1'), {
      status: 'error',
      errorCode: 'pest_disease_inactive',
      errorMessage: 'Ya no está activa.',
      errorData: { pest_disease_ids: ['monilia'] },
    });

    expect(await getQueuedMonitoring(userId, 'a1')).toEqual({
      activityId: 'a1',
      request: payload.request,
      label: payload.label,
      status: 'error',
      errorCode: 'pest_disease_inactive',
      errorMessage: 'Ya no está activa.',
      errorData: { pest_disease_ids: ['monilia'] },
    });
  });

  it('finds nothing for a monitoring without a result in the device', async () => {
    expect(await getQueuedMonitoring(userId, 'a1')).toBeNull();
  });
});

describe('resubmitMonitoring', () => {
  it('replaces what was captured and sends it again', async () => {
    await enqueueMonitoring(userId, 'a1', payload);
    await getOfflineDb(userId).queue.update(monitoringQueueId('a1'), {
      status: 'error',
      errorCode: 'validation_error',
    });

    await resubmitMonitoring(userId, 'a1', {
      ...payload,
      request: { ...payload.request, evaluated_units: 40 },
    });

    expect(await getQueuedMonitoring(userId, 'a1')).toMatchObject({
      status: 'pending',
      errorCode: undefined,
      request: { evaluated_units: 40 },
    });
  });
});
