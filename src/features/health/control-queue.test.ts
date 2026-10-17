import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  CONTROL_RESOURCE,
  type ControlPayload,
  controlQueueId,
  enqueueControl,
} from './control-queue';
import { controlSyncAdapter } from './control-sync-adapter';

const payload: ControlPayload = {
  request: {
    id: 'c1',
    mode: 'scheduled',
    scheduled_date: '2026-10-25',
    assignee_id: 'u1',
    method: null,
    method_description: null,
    planned_input_id: null,
  },
  label: 'Monilia · P-03',
};

let userId: string;

beforeEach(() => {
  userId = `control-queue-${crypto.randomUUID()}`;
});

describe('enqueueControl', () => {
  it('saves the control under its own id, with its detection as parent', async () => {
    await enqueueControl(userId, 'd1', payload);

    expect(
      await getOfflineDb(userId).queue.get(controlQueueId('c1')),
    ).toMatchObject({
      id: 'phytosanitary-control:c1',
      resource: CONTROL_RESOURCE,
      operation: 'create',
      parentId: 'd1',
      status: 'pending',
      payload,
    });
  });

  it('keeps the first one when the same control is saved again', async () => {
    await enqueueControl(userId, 'd1', payload);
    await enqueueControl(userId, 'd1', {
      ...payload,
      label: 'Otra etiqueta',
    });

    expect(
      (await getOfflineDb(userId).queue.get(controlQueueId('c1')))?.payload,
    ).toEqual(payload);
  });
});

const item = {
  id: 'phytosanitary-control:c1',
  resource: CONTROL_RESOURCE,
  operation: 'create' as const,
  parentId: 'd1',
  payload,
  status: 'syncing' as const,
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

describe('controlSyncAdapter', () => {
  it('posts the control at the address of its detection', async () => {
    let received: { url: string; body: unknown } | undefined;
    server.use(
      http.post(
        apiUrl('/api/phytosanitary-detections/:id/controls'),
        async ({ request }) => {
          received = { url: request.url, body: await request.json() };
          return HttpResponse.json(buildAgriculturalActivity(), {
            status: 201,
          });
        },
      ),
    );

    await controlSyncAdapter.send(item);

    expect(received?.url).toBe(
      apiUrl('/api/phytosanitary-detections/d1/controls'),
    );
    expect(received?.body).toEqual(payload.request);
  });

  it('retries without a response, or with one that can get better alone', () => {
    const conflict = controlSyncAdapter.parseConflict;
    expect(conflict(new TypeError('offline'))).toBeNull();
    expect(conflict(apiError(503, { code: 'server_error' }))).toBeNull();
    expect(conflict(apiError(401, { code: 'not_authenticated' }))).toBeNull();
  });

  it('reads a 404 as a detection that no longer exists', () => {
    expect(
      controlSyncAdapter.parseConflict(apiError(404, { code: 'not_found' })),
    ).toEqual({
      code: 'detection_deleted',
      message: 'Esta detección ya no existe.',
    });
  });

  it('sends anything else to the tray with the message of the server', () => {
    expect(
      controlSyncAdapter.parseConflict(
        apiError(422, {
          code: 'assignee_not_available',
          detail: 'El responsable ya no trabaja en esta finca.',
        }),
      ),
    ).toEqual({
      code: 'assignee_not_available',
      message: 'El responsable ya no trabaja en esta finca.',
    });
  });

  it('refreshes the activities, the stocks, what health shows and the notifications', () => {
    expect(controlSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.agriculturalActivities.all(),
      queryKeys.inputStocks.all(),
      queryKeys.health.all(),
      queryKeys.notifications.all(),
    ]);
  });
});
