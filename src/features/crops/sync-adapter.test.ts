import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildCharacterization } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import type { CharacterizationPayload } from './characterization-queue';
import {
  CHARACTERIZATION_PLOT_DELETED_CODE,
  characterizationSyncAdapter,
} from './sync-adapter';

const payload: CharacterizationPayload = {
  plantings: [
    { variety_id: 'v-ccn-51', planting_date: '2021-03', tree_count: 1800 },
  ],
  stage: 'full_production',
  management_system: null,
  shade_type: 'permanent',
  expected_version: null,
  captured_at: '2026-10-03T14:10:00.000Z',
};

const item: QueueItem = {
  id: 'plot-characterization:pl1',
  resource: 'plot-characterizations',
  operation: 'update',
  parentId: 'pl1',
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

describe('characterizationSyncAdapter.send', () => {
  it('puts the whole characterization at the address of its plot', async () => {
    let received: { url: string; body: unknown } | undefined;
    server.use(
      http.put(
        apiUrl('/api/plot-characterizations/:plotId'),
        async ({ request }) => {
          received = { url: request.url, body: await request.json() };
          return HttpResponse.json(buildCharacterization(), { status: 201 });
        },
      ),
    );

    await characterizationSyncAdapter.send(item);

    expect(received?.url).toBe(apiUrl('/api/plot-characterizations/pl1'));
    expect(received?.body).toEqual(payload);
  });
});

describe('characterizationSyncAdapter.parseConflict', () => {
  it('retries without a response, or with one that can get better alone', () => {
    expect(
      characterizationSyncAdapter.parseConflict(new TypeError('offline')),
    ).toBeNull();
    expect(
      characterizationSyncAdapter.parseConflict(
        apiError(503, { code: 'server_error' }),
      ),
    ).toBeNull();
  });

  it('reads a 404 as a plot that was deleted', () => {
    expect(
      characterizationSyncAdapter.parseConflict(
        apiError(404, { code: 'not_found' }),
      ),
    ).toMatchObject({ code: CHARACTERIZATION_PLOT_DELETED_CODE });
  });

  it('keeps the current characterization that comes with a stale version', () => {
    const current = buildCharacterization({ version: 4 });

    expect(
      characterizationSyncAdapter.parseConflict(
        apiError(409, {
          code: 'stale_version',
          detail: 'La caracterización fue modificada.',
          current,
        }),
      ),
    ).toEqual({
      code: 'stale_version',
      message: 'La caracterización fue modificada.',
      data: { current },
    });
  });

  it('sends a rejected variety to the tray with the message of the server', () => {
    expect(
      characterizationSyncAdapter.parseConflict(
        apiError(422, {
          code: 'variety_inactive',
          detail: 'La variedad está desactivada.',
        }),
      ),
    ).toEqual({
      code: 'variety_inactive',
      message: 'La variedad está desactivada.',
      data: undefined,
    });
  });
});

describe('characterizationSyncAdapter.refreshAfterSync', () => {
  it('refreshes the characterizations of every farm: the queued record only knows its plot', () => {
    expect(characterizationSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.characterizations.allFarms(),
    ]);
    // La clave de una finca cuelga de la de todas: invalidar la primera alcanza a la segunda.
    expect(queryKeys.characterizations.byFarm('f1')).toEqual(
      expect.arrayContaining([...queryKeys.characterizations.allFarms()]),
    );
  });
});
