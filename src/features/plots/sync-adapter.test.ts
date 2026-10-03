import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import {
  clearAdapters,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';
import { buildPlot } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  CREATED_PLOT_VERSION,
  enqueuePlotCreate,
  getQueuedPlot,
} from './plot-queue';
import { PLOT_DELETED_CODE, plotSyncAdapter } from './sync-adapter';

const fields = { code: 'P1', area_hectares: '2.40', boundary: null };

const CREATED_AT = Date.UTC(2026, 9, 1, 15, 30);

const queueItem = (overrides: Partial<QueueItem>): QueueItem => ({
  id: 'pl1',
  resource: 'plots',
  operation: 'create',
  parentId: 'f1',
  payload: { id: 'pl1', farm_id: 'f1', ...fields },
  status: 'syncing',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
});

const apiError = (status: number, code: string, extra = {}) =>
  new ApiError(status, {
    detail: 'Mensaje del servidor.',
    code,
    fields: {},
    ...extra,
  });

describe('plotSyncAdapter.send', () => {
  it('creates the plot with its device id and the time it was captured', async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/plots'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildPlot(), { status: 201 });
      }),
    );

    await plotSyncAdapter.send(queueItem({}));

    expect(body).toEqual({
      id: 'pl1',
      farm_id: 'f1',
      ...fields,
      captured_at: '2026-10-01T15:30:00.000Z',
    });
  });

  it('sends an edit to the plot it belongs to, with its expected version', async () => {
    let body: unknown;
    server.use(
      http.patch(apiUrl('/api/plots/s1'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildPlot({ id: 's1', version: 3 }));
      }),
    );

    await plotSyncAdapter.send(
      queueItem({
        id: 's1',
        operation: 'update',
        payload: { ...fields, expected_version: 2 },
      }),
    );

    expect(body).toEqual({ ...fields, expected_version: 2 });
  });
});

describe('plotSyncAdapter.parseConflict', () => {
  it.each([
    [409, 'duplicate_plot_code'],
    [409, 'stale_version'],
    [422, 'plot_area_exceeds_farm'],
    [422, 'invalid_boundary'],
    [422, 'farm_inactive'],
    [400, 'validation_error'],
    [403, 'permission_denied'],
  ])(
    'sends %i %s to the error tray with the server message',
    (status, code) => {
      expect(plotSyncAdapter.parseConflict(apiError(status, code))).toEqual({
        code,
        message: 'Mensaje del servidor.',
        data: undefined,
      });
    },
  );

  it('keeps the suggestion the server gave for an overlap', () => {
    const extra = {
      overlaps: [
        {
          plot_id: 'a',
          code: 'P2',
          overlap_area_hectares: '0.1200',
          boundary: [],
        },
      ],
      suggested_boundary: [],
      suggested_measured_area_hectares: '2.2900',
    };

    expect(
      plotSyncAdapter.parseConflict(apiError(422, 'plot_overlap', extra)),
    ).toEqual({
      code: 'plot_overlap',
      message: 'Mensaje del servidor.',
      data: extra,
    });
  });

  it('keeps the calculated area of an area mismatch', () => {
    expect(
      plotSyncAdapter.parseConflict(
        apiError(422, 'area_mismatch', { measured_area_hectares: '2.4100' }),
      )?.data,
    ).toEqual({ measured_area_hectares: '2.4100' });
  });

  it('keeps the server plot of a stale version', () => {
    const current = buildPlot({ version: 4 });

    expect(
      plotSyncAdapter.parseConflict(apiError(409, 'stale_version', { current }))
        ?.data,
    ).toEqual({ current });
  });

  it('explains that the plot or its farm was deleted instead of the generic not found', () => {
    expect(plotSyncAdapter.parseConflict(apiError(404, 'not_found'))).toEqual({
      code: PLOT_DELETED_CODE,
      message: 'Esta parcela o su finca fue eliminada. Descarta este registro.',
    });
  });

  it.each([
    [401, 'not_authenticated'],
    [429, 'throttled'],
    [500, 'internal_error'],
    [503, 'unexpected_response'],
  ])('retries %i %s later', (status, code) => {
    expect(plotSyncAdapter.parseConflict(apiError(status, code))).toBeNull();
  });

  it('retries when there was no answer from the server', () => {
    expect(
      plotSyncAdapter.parseConflict(new TypeError('Failed to fetch')),
    ).toBeNull();
  });
});

describe('plotSyncAdapter.recover', () => {
  it('turns a create that already reached the server into an edit of the created version', () => {
    expect(
      plotSyncAdapter.recover?.(
        queueItem({}),
        apiError(409, 'plot_id_conflict', {
          current: buildPlot({ version: 3 }),
        }),
      ),
    ).toEqual({
      operation: 'update',
      // Siempre la versión de creación, no la actual del servidor: si alguien la cambió, la
      // edición debe caer en stale_version en vez de pisar ese cambio.
      payload: { ...fields, expected_version: CREATED_PLOT_VERSION },
    });
  });

  it('leaves a real id clash for the error tray', () => {
    expect(
      plotSyncAdapter.recover?.(
        queueItem({}),
        apiError(409, 'plot_id_conflict'),
      ),
    ).toBeNull();
  });

  it('only recovers creates that hit an id conflict', () => {
    expect(
      plotSyncAdapter.recover?.(
        queueItem({
          operation: 'update',
          payload: { ...fields, expected_version: 1 },
        }),
        apiError(409, 'plot_id_conflict', { current: buildPlot() }),
      ),
    ).toBeNull();
    expect(
      plotSyncAdapter.recover?.(
        queueItem({}),
        apiError(409, 'duplicate_plot_code'),
      ),
    ).toBeNull();
  });
});

describe('the queue with the plot adapter', () => {
  afterEach(() => clearAdapters());

  it('sends a plot, and moves an overlap to the tray keeping the suggestion', async () => {
    const userId = `plot-sync-${crypto.randomUUID()}`;
    registerAdapter(plotSyncAdapter);
    server.use(
      http.post(apiUrl('/api/plots'), () =>
        HttpResponse.json(
          {
            detail: 'El polígono se superpone con otra parcela de la finca.',
            code: 'plot_overlap',
            fields: {},
            overlaps: [],
            suggested_boundary: null,
          },
          { status: 422 },
        ),
      ),
    );
    await enqueuePlotCreate(userId, 'pl1', 'f1', {
      code: 'P1',
      area_hectares: '1.00',
      vertices: [],
    });

    await processQueue(userId);

    const item = await getOfflineDb(userId).queue.get('pl1');
    expect(item).toMatchObject({ status: 'error', errorCode: 'plot_overlap' });
    expect((await getQueuedPlot(userId, 'pl1'))?.errorData).toMatchObject({
      suggested_boundary: null,
    });
  });
});
