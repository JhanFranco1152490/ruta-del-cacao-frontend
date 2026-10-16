import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import type { CompletionPayload } from './completion-queue';
import {
  completionSyncAdapter,
  isCorrectableCompletionError,
} from './sync-adapter';

const payload: CompletionPayload = {
  request: {
    done_date: '2026-10-19',
    inputs: [{ input_id: 'in1', quantity: '100' }],
    captured_at: '2026-10-19T21:42:00.000Z',
  },
  label: 'Fertilización · P03',
};

const item: QueueItem = {
  id: 'activity-completion:a1',
  resource: 'agricultural-activity-completions',
  operation: 'update',
  parentId: 'a1',
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

const conflict = (error: unknown) => completionSyncAdapter.parseConflict(error);

describe('completionSyncAdapter.send', () => {
  it('posts only the request at the address of its activity', async () => {
    let received: { url: string; body: unknown } | undefined;
    server.use(
      http.post(
        apiUrl('/api/agricultural-activities/:id/completion'),
        async ({ request }) => {
          received = { url: request.url, body: await request.json() };
          return HttpResponse.json(
            buildAgriculturalActivity({ status: 'done' }),
          );
        },
      ),
    );

    await completionSyncAdapter.send(item);

    expect(received?.url).toBe(
      apiUrl('/api/agricultural-activities/a1/completion'),
    );
    // La etiqueta de la bandeja se queda en el dispositivo.
    expect(received?.body).toEqual(payload.request);
  });
});

describe('completionSyncAdapter.parseConflict', () => {
  it('retries without a response, or with one that can get better alone', () => {
    expect(conflict(new TypeError('offline'))).toBeNull();
    expect(conflict(apiError(503, { code: 'server_error' }))).toBeNull();
    expect(conflict(apiError(401, { code: 'not_authenticated' }))).toBeNull();
    expect(conflict(apiError(429, { code: 'throttled' }))).toBeNull();
  });

  it('reads a 404 as an activity that was deleted', () => {
    expect(conflict(apiError(404, { code: 'not_found' }))).toEqual({
      code: 'activity_deleted',
      message: 'Esta actividad ya no existe.',
    });
  });

  it('says that another person already recorded the activity', () => {
    expect(
      conflict(
        apiError(409, {
          code: 'activity_already_done',
          detail: 'Las actividades realizadas no se pueden modificar.',
        }),
      ),
    ).toEqual({
      code: 'activity_already_done',
      message:
        'Esta actividad ya fue registrada como realizada por otra persona.',
    });
  });

  it('keeps the inputs that are no longer available, to mark them when correcting', () => {
    expect(
      conflict(
        apiError(422, {
          code: 'input_inactive',
          detail: 'Este insumo ya no está disponible. Elige otro del catálogo.',
          input_ids: ['in1'],
        }),
      ),
    ).toEqual({
      code: 'input_inactive',
      message: 'Este insumo ya no está disponible. Elige otro del catálogo.',
      data: { input_ids: ['in1'] },
    });
  });

  it('keeps the fields that the server did not accept', () => {
    expect(
      conflict(
        apiError(400, {
          code: 'validation_error',
          detail: 'Los datos enviados no son válidos.',
          fields: { done_date: ['La fecha no puede ser futura.'] },
        }),
      ),
    ).toEqual({
      code: 'validation_error',
      message: 'Los datos enviados no son válidos.',
      data: { fields: { done_date: ['La fecha no puede ser futura.'] } },
    });
  });

  it('sends anything else to the tray with the message of the server', () => {
    expect(
      conflict(
        apiError(422, {
          code: 'monitoring_requires_result',
          detail: 'Un monitoreo se registra con su resultado.',
        }),
      ),
    ).toEqual({
      code: 'monitoring_requires_result',
      message: 'Un monitoreo se registra con su resultado.',
      data: undefined,
    });
  });
});

describe('isCorrectableCompletionError', () => {
  it('is what the person can fix by opening what was captured', () => {
    expect(isCorrectableCompletionError('input_inactive')).toBe(true);
    expect(isCorrectableCompletionError('validation_error')).toBe(true);
  });

  it('is not what only can be discarded', () => {
    for (const code of [
      'activity_already_done',
      'activity_deleted',
      'monitoring_requires_result',
      'permission_denied',
      undefined,
    ]) {
      expect(isCorrectableCompletionError(code)).toBe(false);
    }
  });
});

describe('completionSyncAdapter.refreshAfterSync', () => {
  it('refreshes the activities and the stocks of every farm', () => {
    expect(completionSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.agriculturalActivities.all(),
      queryKeys.inputStocks.all(),
    ]);
    // Las claves de un mes y de una finca cuelgan de las que se refrescan.
    expect(
      queryKeys.agriculturalActivities.month(null, '2026-10').slice(0, 1),
    ).toEqual([...queryKeys.agriculturalActivities.all()]);
    expect(queryKeys.inputStocks.byFarm('f1').slice(0, 1)).toEqual([
      ...queryKeys.inputStocks.all(),
    ]);
  });
});
