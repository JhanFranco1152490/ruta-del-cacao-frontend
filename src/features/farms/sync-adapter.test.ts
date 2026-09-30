import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import type { QueueItem } from '@/lib/offline/db';
import { buildFarm } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { farmSyncAdapter } from './sync-adapter';

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
    [404, 'not_found'],
  ])(
    'sends %i %s to the error tray with the server message',
    (status, code) => {
      expect(farmSyncAdapter.parseConflict(apiError(status, code))).toEqual({
        code,
        message: 'Mensaje del servidor.',
      });
    },
  );

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
