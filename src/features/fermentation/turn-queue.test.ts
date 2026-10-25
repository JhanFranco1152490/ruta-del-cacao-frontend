import { beforeEach, describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';

import {
  enqueueTurn,
  getQueuedTurn,
  listQueuedTurns,
  pendingTurnsOf,
  type QueuedTurn,
  resubmitTurn,
  TURN_RESOURCE,
  turnQueueId,
  turnQueueLabel,
  type TurnPayload,
} from './turn-queue';

const payload: TurnPayload = {
  lotId: 'l1',
  request: {
    id: 'ft1',
    turned_at: '2026-10-17T07:30:00-05:00',
    temperature_c: '45.0',
    ph: '4.90',
    notes: '',
    captured_at: '2026-10-17T12:31:00.000Z',
  },
  label: '000123-F02-P05-261014-1 · volteo 1 · 17 oct. 07:30',
};

let userId: string;

beforeEach(() => {
  userId = `turn-queue-${crypto.randomUUID()}`;
});

describe('turnQueueLabel', () => {
  it('names the turn by its lot, its number and its time', () => {
    expect(
      turnQueueLabel('000123-F02-P05-261014-1', 3, '2026-10-17T08:00:00-05:00'),
    ).toBe('000123-F02-P05-261014-1 · volteo 3 · 17 oct. 08:00');
  });
});

describe('enqueueTurn', () => {
  it('saves the turn under its own key, with nothing to wait for', async () => {
    await enqueueTurn(userId, payload);

    const saved = await getOfflineDb(userId).queue.get(turnQueueId('ft1'));
    expect(saved).toMatchObject({
      id: 'fermentation-turn:ft1',
      resource: TURN_RESOURCE,
      operation: 'create',
      payload,
      status: 'pending',
    });
    expect(saved?.parentId).toBeUndefined();
  });

  it('keeps the first one when the same turn is saved twice', async () => {
    await enqueueTurn(userId, payload);
    await enqueueTurn(userId, {
      ...payload,
      request: { ...payload.request, ph: '5.00' },
    });

    expect((await getQueuedTurn(userId, 'ft1'))?.request.ph).toBe('4.90');
  });
});

describe('reading the queued turns', () => {
  it('reads one turn and every turn on the device', async () => {
    await enqueueTurn(userId, payload);
    await enqueueTurn(userId, {
      ...payload,
      lotId: 'l2',
      request: { ...payload.request, id: 'ft2' },
    });

    expect(await getQueuedTurn(userId, 'ft1')).toMatchObject({
      id: 'ft1',
      lotId: 'l1',
      label: payload.label,
      status: 'pending',
    });
    expect(
      (await listQueuedTurns(userId)).map(({ id }) => id).toSorted(),
    ).toEqual(['ft1', 'ft2']);
    expect(await getQueuedTurn(userId, 'nope')).toBeNull();
  });
});

describe('resubmitTurn', () => {
  it('replaces what was captured and sends it again', async () => {
    await enqueueTurn(userId, payload);
    await getOfflineDb(userId).queue.update(turnQueueId('ft1'), {
      status: 'error',
      errorCode: 'validation_error',
    });

    await resubmitTurn(userId, {
      ...payload,
      request: { ...payload.request, ph: '4.85' },
    });

    expect(await getQueuedTurn(userId, 'ft1')).toMatchObject({
      status: 'pending',
      request: { ph: '4.85' },
    });
  });
});

describe('pendingTurnsOf', () => {
  const queued = (overrides: Partial<QueuedTurn>): QueuedTurn => ({
    id: 'ft1',
    lotId: 'l1',
    request: payload.request,
    label: payload.label,
    status: 'pending',
    ...overrides,
  });

  // Uno que el servidor rechazó no cuenta: espera en la bandeja a que lo corrijan o lo descarten.
  it('keeps the turns of the lot still on their way to the server', () => {
    const list = [
      queued({ id: 'a' }),
      queued({ id: 'b', status: 'syncing' }),
      queued({ id: 'c', status: 'error' }),
      queued({ id: 'd', lotId: 'l2' }),
    ];

    expect(pendingTurnsOf(list, 'l1').map(({ id }) => id)).toEqual(['a', 'b']);
  });
});
