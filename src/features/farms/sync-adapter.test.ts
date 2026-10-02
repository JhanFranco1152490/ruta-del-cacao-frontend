import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import {
  clearAdapters,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';
import { apiError as apiErrorResponse, buildFarm } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { enqueueFarmCreate } from './farm-queue';
import { FARM_DELETED_CODE, farmSyncAdapter } from './sync-adapter';

const fields = {
  name: 'La Esperanza',
  department_id: '54',
  municipality_id: '54001',
  details: '',
  area_hectares: '12.50',
  altitude_masl: 950,
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

const CREATED_AT = Date.UTC(2026, 8, 29, 15, 30);

const queueItem = (overrides: Partial<QueueItem>): QueueItem => ({
  id: 'f1',
  resource: 'farms',
  operation: 'create',
  payload: { id: 'f1', ...fields },
  status: 'syncing',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
});

const apiError = (status: number, code: string) =>
  new ApiError(status, { detail: 'Mensaje del servidor.', code, fields: {} });

describe('farmSyncAdapter.send', () => {
  it('creates the farm with its device id and the time it was captured', async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/farms'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildFarm(), { status: 201 });
      }),
    );

    await farmSyncAdapter.send(queueItem({}));

    expect(body).toEqual({
      id: 'f1',
      ...fields,
      captured_at: '2026-09-29T15:30:00.000Z',
    });
  });

  it('sends an edit to the farm it belongs to, with its expected version', async () => {
    let body: unknown;
    server.use(
      http.patch(apiUrl('/api/farms/s1'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildFarm({ id: 's1', version: 3 }));
      }),
    );

    await farmSyncAdapter.send(
      queueItem({
        id: 's1',
        operation: 'update',
        payload: { ...fields, expected_version: 2 },
      }),
    );

    expect(body).toEqual({ ...fields, expected_version: 2 });
  });
});

describe('farmSyncAdapter.parseConflict', () => {
  it.each([
    [409, 'duplicate_farm_name'],
    [409, 'stale_version'],
    [422, 'municipality_department_mismatch'],
    [400, 'validation_error'],
    [403, 'permission_denied'],
    [422, 'location_outside_operating_area'],
  ])(
    'sends %i %s to the error tray with the server message',
    (status, code) => {
      expect(farmSyncAdapter.parseConflict(apiError(status, code))).toEqual({
        code,
        message: 'Mensaje del servidor.',
      });
    },
  );

  // Solo una edición puede encontrar su finca inexistente: la eliminaron mientras esperaba.
  it('explains that the farm was deleted instead of the generic not found', () => {
    expect(farmSyncAdapter.parseConflict(apiError(404, 'not_found'))).toEqual({
      code: FARM_DELETED_CODE,
      message: 'Esta finca fue eliminada. Descarta esta edición.',
    });
  });

  it.each([
    [401, 'not_authenticated'],
    [429, 'throttled'],
    [500, 'internal_error'],
    [503, 'unexpected_response'],
  ])('retries %i %s later', (status, code) => {
    expect(farmSyncAdapter.parseConflict(apiError(status, code))).toBeNull();
  });

  it('retries when there was no answer from the server', () => {
    expect(
      farmSyncAdapter.parseConflict(new TypeError('Failed to fetch')),
    ).toBeNull();
  });
});

// Alta que llegó al servidor pero cuya respuesta se perdió, editada después en el dispositivo:
// el reenvío choca con la finca ya creada.
const idConflict = (current?: unknown) =>
  new ApiError(409, {
    detail: 'El identificador ya pertenece a otra finca.',
    code: 'farm_id_conflict',
    fields: {},
    ...(current ? { current } : {}),
  });

const editedValues = {
  name: 'Nombre corregido',
  municipality_id: '54001',
  details: '',
  area_hectares: '12.50',
  altitude_masl: '950',
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

const idConflictResponse = (version: number) =>
  HttpResponse.json(
    {
      detail: 'El identificador ya pertenece a otra finca.',
      code: 'farm_id_conflict',
      fields: {},
      current: buildFarm({ id: 'f1', name: 'Nombre original', version }),
    },
    { status: 409 },
  );

describe('farmSyncAdapter.recover', () => {
  it('turns a create that already reached the server into an edit of the created version', () => {
    expect(
      farmSyncAdapter.recover?.(
        queueItem({}),
        idConflict(buildFarm({ id: 'f1', version: 3 })),
      ),
    ).toEqual({
      operation: 'update',
      // Siempre la versión de creación, no la actual del servidor: si alguien la cambió
      // (versión 3), la edición debe caer en stale_version en vez de pisar ese cambio.
      payload: { ...fields, expected_version: 1 },
    });
  });

  it('leaves a real id clash for the error tray', () => {
    expect(farmSyncAdapter.recover?.(queueItem({}), idConflict())).toBeNull();
  });

  it('only recovers creates that hit an id conflict', () => {
    expect(
      farmSyncAdapter.recover?.(
        queueItem({
          operation: 'update',
          payload: { ...fields, expected_version: 1 },
        }),
        idConflict(buildFarm({ id: 'f1' })),
      ),
    ).toBeNull();
    expect(
      farmSyncAdapter.recover?.(
        queueItem({}),
        apiError(409, 'duplicate_farm_name'),
      ),
    ).toBeNull();
  });
});

describe('a create edited after its response was lost', () => {
  afterEach(() => clearAdapters());

  it('is applied as an edit instead of getting stuck in the error tray', async () => {
    const userId = `farm-recover-${crypto.randomUUID()}`;
    const patches: unknown[] = [];
    registerAdapter(farmSyncAdapter);
    server.use(
      http.post(apiUrl('/api/farms'), () => idConflictResponse(1)),
      http.patch(apiUrl('/api/farms/f1'), async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(buildFarm({ id: 'f1', version: 2 }));
      }),
    );
    await enqueueFarmCreate(userId, 'f1', editedValues);

    await processQueue(userId);

    expect(patches).toEqual([
      expect.objectContaining({
        name: 'Nombre corregido',
        expected_version: 1,
      }),
    ]);
    expect(await getOfflineDb(userId).queue.get('f1')).toBeUndefined();
  });

  it('waits for review when someone changed the farm in the meantime', async () => {
    const userId = `farm-recover-${crypto.randomUUID()}`;
    registerAdapter(farmSyncAdapter);
    server.use(
      http.post(apiUrl('/api/farms'), () => idConflictResponse(2)),
      http.patch(apiUrl('/api/farms/f1'), () =>
        apiErrorResponse(409, 'stale_version', 'La finca cambió.'),
      ),
    );
    await enqueueFarmCreate(userId, 'f1', editedValues);

    await processQueue(userId);

    expect(await getOfflineDb(userId).queue.get('f1')).toMatchObject({
      operation: 'update',
      status: 'error',
      errorCode: 'stale_version',
      payload: { expected_version: 1 },
    });
  });
});
