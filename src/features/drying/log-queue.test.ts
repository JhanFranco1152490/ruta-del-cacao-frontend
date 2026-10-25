import { beforeEach, describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';

import {
  enqueueLog,
  getQueuedLog,
  listQueuedLogs,
  LOG_RESOURCE,
  logQueueId,
  logQueueLabel,
  type LogPayload,
  pendingLogsOf,
  type QueuedLog,
  resubmitLog,
} from './log-queue';

const payload: LogPayload = {
  lotId: 'l1',
  request: {
    id: 'dl1',
    measured_at: '2026-10-23T16:00:00-05:00',
    moisture_pct: '12.4',
    sun_hours: '6.0',
    shade_hours: null,
    turn_count: 2,
    turn_frequency_hours: '3.0',
    weather: 'sunny',
    notes: '',
    captured_at: '2026-10-23T21:01:00.000Z',
  },
  label: '000123-F02-P05-261014-1 · bitácora del día 2 · 23 oct',
};

let userId: string;

beforeEach(() => {
  userId = `log-queue-${crypto.randomUUID()}`;
});

describe('logQueueLabel', () => {
  it('names the log by its lot, its day and its date', () => {
    expect(
      logQueueLabel('000123-F02-P05-261014-1', 3, '2026-10-24T08:00:00-05:00'),
    ).toBe('000123-F02-P05-261014-1 · bitácora del día 3 · 24 oct');
  });
});

describe('enqueueLog', () => {
  it('saves the log under its own key, with nothing to wait for', async () => {
    await enqueueLog(userId, payload);

    const saved = await getOfflineDb(userId).queue.get(logQueueId('dl1'));
    expect(saved).toMatchObject({
      id: 'drying-log:dl1',
      resource: LOG_RESOURCE,
      operation: 'create',
      payload,
      status: 'pending',
    });
    expect(saved?.parentId).toBeUndefined();
  });

  it('keeps the first one when the same log is saved twice', async () => {
    await enqueueLog(userId, payload);
    await enqueueLog(userId, {
      ...payload,
      request: { ...payload.request, moisture_pct: '9.0' },
    });

    expect((await getQueuedLog(userId, 'dl1'))?.request.moisture_pct).toBe(
      '12.4',
    );
  });
});

describe('reading the queued logs', () => {
  it('reads one log and every log on the device', async () => {
    await enqueueLog(userId, payload);
    await enqueueLog(userId, {
      ...payload,
      lotId: 'l2',
      request: { ...payload.request, id: 'dl2' },
    });

    expect(await getQueuedLog(userId, 'dl1')).toMatchObject({
      id: 'dl1',
      lotId: 'l1',
      label: payload.label,
      status: 'pending',
    });
    expect(
      (await listQueuedLogs(userId)).map(({ id }) => id).toSorted(),
    ).toEqual(['dl1', 'dl2']);
    expect(await getQueuedLog(userId, 'nope')).toBeNull();
  });

  it('does not take a record of another resource for a log', async () => {
    await getOfflineDb(userId).queue.put({
      id: logQueueId('x1'),
      resource: 'fermentation-turns',
      operation: 'create',
      payload,
      status: 'pending',
      createdAt: 0,
      updatedAt: 0,
    });

    expect(await getQueuedLog(userId, 'x1')).toBeNull();
    expect(await listQueuedLogs(userId)).toEqual([]);
  });
});

describe('resubmitLog', () => {
  it('replaces what was captured and sends it again', async () => {
    await enqueueLog(userId, payload);
    await getOfflineDb(userId).queue.update(logQueueId('dl1'), {
      status: 'error',
      errorCode: 'validation_error',
    });

    await resubmitLog(userId, {
      ...payload,
      request: { ...payload.request, moisture_pct: '10.0' },
    });

    expect(await getQueuedLog(userId, 'dl1')).toMatchObject({
      status: 'pending',
      request: { moisture_pct: '10.0' },
    });
  });
});

describe('pendingLogsOf', () => {
  const queued = (overrides: Partial<QueuedLog>): QueuedLog => ({
    id: 'dl1',
    lotId: 'l1',
    request: payload.request,
    label: payload.label,
    status: 'pending',
    ...overrides,
  });

  // Una que el servidor rechazó no cuenta: espera en la bandeja a que la corrijan o la descarten.
  it('keeps the logs of the lot still on their way to the server', () => {
    const list = [
      queued({ id: 'a' }),
      queued({ id: 'b', status: 'syncing' }),
      queued({ id: 'c', status: 'error' }),
      queued({ id: 'd', lotId: 'l2' }),
    ];

    expect(pendingLogsOf(list, 'l1').map(({ id }) => id)).toEqual(['a', 'b']);
  });
});
