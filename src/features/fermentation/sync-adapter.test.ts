import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildFermentationTurn } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  FERMENTATION_FINISHED_MESSAGE,
  FERMENTATION_GONE_MESSAGE,
  isCorrectableTurnError,
  TURN_ALREADY_SENT_MESSAGE,
  turnSyncAdapter,
} from './sync-adapter';
import type { TurnPayload } from './turn-queue';

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

const item: QueueItem = {
  id: 'fermentation-turn:ft1',
  resource: 'fermentation-turns',
  operation: 'create',
  payload,
  status: 'syncing',
  createdAt: 0,
  updatedAt: 0,
};

const apiError = (status: number, body: Record<string, unknown>) =>
  new ApiError(status, {
    detail: 'Error de prueba.',
    code: 'validation_error',
    fields: {},
    ...body,
  });

const conflict = (error: unknown) => turnSyncAdapter.parseConflict(error);

describe('turnSyncAdapter.send', () => {
  it('posts the turn to its lot as it was captured, and returns what the server answered', async () => {
    let received: unknown;
    server.use(
      http.post(apiUrl('/api/fermentation/l1/turns'), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(buildFermentationTurn({ number: 2 }), {
          status: 201,
        });
      }),
    );

    const response = await turnSyncAdapter.send(item);

    expect(received).toEqual(payload.request);
    expect(response).toMatchObject({ id: 'ft1', number: 2 });
  });
});

describe('turnSyncAdapter.parseConflict', () => {
  it('retries without an answer from the server or with one that may change by itself', () => {
    expect(conflict(new TypeError('Failed to fetch'))).toBeNull();
    expect(conflict(apiError(503, { code: 'internal_error' }))).toBeNull();
    expect(conflict(apiError(401, { code: 'not_authenticated' }))).toBeNull();
  });

  it('explains that the fermentation is no longer reachable', () => {
    expect(conflict(apiError(404, { code: 'not_found' }))).toEqual({
      code: 'not_found',
      message: FERMENTATION_GONE_MESSAGE,
    });
  });

  // Alguien la finalizó desde otro teléfono mientras este volteo esperaba la señal.
  it('explains that the fermentation already finished', () => {
    expect(
      conflict(apiError(409, { code: 'fermentation_not_in_progress' })),
    ).toEqual({
      code: 'fermentation_not_in_progress',
      message: FERMENTATION_FINISHED_MESSAGE,
    });
  });

  it('explains that a turn that already reached the server with other data is only discarded', () => {
    expect(conflict(apiError(409, { code: 'turn_id_conflict' }))).toEqual({
      code: 'turn_id_conflict',
      message: TURN_ALREADY_SENT_MESSAGE,
    });
  });

  it('keeps the field and the turn already recorded at that time', () => {
    expect(
      conflict(
        apiError(409, {
          code: 'duplicate_turn_time',
          detail: 'Ya hay un volteo registrado a esa hora.',
          fields: { turned_at: ['Ya hay un volteo registrado a esa hora.'] },
          existing: { id: 'ft0', number: 1 },
        }),
      ),
    ).toEqual({
      code: 'duplicate_turn_time',
      message: 'Ya hay un volteo registrado a esa hora.',
      data: {
        fields: { turned_at: ['Ya hay un volteo registrado a esa hora.'] },
        existing: { id: 'ft0', number: 1 },
      },
    });
  });

  it('keeps the fields of a validation error to mark them when correcting', () => {
    expect(
      conflict(apiError(400, { fields: { ph: ['pH válido entre 0 y 14'] } })),
    ).toEqual({
      code: 'validation_error',
      message: 'Error de prueba.',
      data: { fields: { ph: ['pH válido entre 0 y 14'] } },
    });
  });
});

describe('isCorrectableTurnError', () => {
  it.each(['validation_error', 'duplicate_turn_time'])(
    'lets %s be corrected',
    (code) => {
      expect(isCorrectableTurnError(code)).toBe(true);
    },
  );

  it.each([
    'fermentation_not_in_progress',
    'not_found',
    'turn_id_conflict',
    undefined,
  ])('only lets %s be discarded', (code) => {
    expect(isCorrectableTurnError(code)).toBe(false);
  });
});

describe('turnSyncAdapter.refreshAfterSync', () => {
  it('refreshes every fermentation read, the list and the lot detail', () => {
    expect(turnSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.fermentation.all(),
    ]);
  });
});
