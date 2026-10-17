import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import type { MonitoringPayload } from './monitoring-queue';
import {
  isCorrectableMonitoringError,
  monitoringSyncAdapter,
} from './monitoring-sync-adapter';

const payload: MonitoringPayload = {
  request: {
    done_date: '2026-10-19',
    sampling_unit: 'trees',
    evaluated_units: 50,
    no_presence: true,
    detections: [],
    captured_at: '2026-10-19T21:42:00.000Z',
  },
  label: 'P-03 · 19 de octubre',
};

const item: QueueItem = {
  id: 'monitoring-result:a1',
  resource: 'monitoring-results',
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

const conflict = (error: unknown) => monitoringSyncAdapter.parseConflict(error);

describe('monitoringSyncAdapter.send', () => {
  it('posts only the request at the address of its monitoring', async () => {
    let received: { url: string; body: unknown } | undefined;
    server.use(
      http.post(
        apiUrl('/api/agricultural-activities/:id/monitoring'),
        async ({ request }) => {
          received = { url: request.url, body: await request.json() };
          return HttpResponse.json(
            buildAgriculturalActivity({ status: 'done' }),
            { status: 201 },
          );
        },
      ),
    );

    await monitoringSyncAdapter.send(item);

    expect(received?.url).toBe(
      apiUrl('/api/agricultural-activities/a1/monitoring'),
    );
    // La etiqueta de la bandeja se queda en el dispositivo.
    expect(received?.body).toEqual(payload.request);
  });
});

describe('monitoringSyncAdapter.parseConflict', () => {
  it('retries without a response, or with one that can get better alone', () => {
    expect(conflict(new TypeError('offline'))).toBeNull();
    expect(conflict(apiError(503, { code: 'server_error' }))).toBeNull();
    expect(conflict(apiError(401, { code: 'not_authenticated' }))).toBeNull();
    expect(conflict(apiError(429, { code: 'throttled' }))).toBeNull();
  });

  it('reads a 404 as a monitoring that was deleted', () => {
    expect(conflict(apiError(404, { code: 'not_found' }))).toEqual({
      code: 'monitoring_deleted',
      message: 'Este monitoreo ya no existe.',
    });
  });

  it('says that the monitoring was already recorded', () => {
    expect(conflict(apiError(409, { code: 'activity_already_done' }))).toEqual({
      code: 'activity_already_done',
      message: 'Este monitoreo ya fue registrado por otra persona.',
    });
  });

  it('keeps the pests or diseases that are no longer active, to mark them when correcting', () => {
    expect(
      conflict(
        apiError(422, {
          code: 'pest_disease_inactive',
          detail: 'Una plaga o enfermedad ya no está activa.',
          pest_disease_ids: ['monilia'],
        }),
      ),
    ).toEqual({
      code: 'pest_disease_inactive',
      message: 'Una plaga o enfermedad ya no está activa.',
      data: { pest_disease_ids: ['monilia'] },
    });
  });

  it('keeps the inputs that are no longer active, to choose others when correcting', () => {
    expect(
      conflict(
        apiError(422, {
          code: 'input_inactive',
          detail: 'Este insumo ya no está disponible.',
          input_ids: ['copper'],
        }),
      ),
    ).toEqual({
      code: 'input_inactive',
      message: 'Este insumo ya no está disponible.',
      data: { input_ids: ['copper'] },
    });
  });

  it('keeps the fields that the server did not accept', () => {
    expect(
      conflict(
        apiError(400, {
          detail: 'Los datos enviados no son válidos.',
          fields: { detections: ['Indica las unidades afectadas.'] },
        }),
      ),
    ).toEqual({
      code: 'validation_error',
      message: 'Los datos enviados no son válidos.',
      data: { fields: { detections: ['Indica las unidades afectadas.'] } },
    });
  });

  it('sends a refusal to the tray with the message of the server', () => {
    expect(
      conflict(
        apiError(403, {
          code: 'permission_denied',
          detail: 'No puedes registrar este monitoreo.',
        }),
      ),
    ).toEqual({
      code: 'permission_denied',
      message: 'No puedes registrar este monitoreo.',
      data: undefined,
    });
  });
});

describe('isCorrectableMonitoringError', () => {
  it('is what the person can fix by opening what was captured', () => {
    expect(isCorrectableMonitoringError('pest_disease_inactive')).toBe(true);
    expect(isCorrectableMonitoringError('validation_error')).toBe(true);
    expect(isCorrectableMonitoringError('input_inactive')).toBe(true);
  });

  it('is not what only can be discarded', () => {
    for (const code of [
      'activity_already_done',
      'monitoring_deleted',
      'permission_denied',
      'not_a_monitoring',
      undefined,
    ]) {
      expect(isCorrectableMonitoringError(code)).toBe(false);
    }
  });
});

describe('monitoringSyncAdapter.refreshAfterSync', () => {
  it('refreshes the activities, the stocks, what health shows and the notifications', () => {
    expect(monitoringSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.agriculturalActivities.all(),
      queryKeys.inputStocks.all(),
      queryKeys.health.all(),
      queryKeys.notifications.all(),
    ]);
  });
});
