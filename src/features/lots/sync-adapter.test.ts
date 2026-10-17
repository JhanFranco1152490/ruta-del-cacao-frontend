import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildLot } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import type { LotPayload } from './lot-queue';
import {
  LOT_ALREADY_FORMED_MESSAGE,
  LOT_HARVEST_GONE_CODE,
  LOT_HARVEST_GONE_MESSAGE,
  lotSyncAdapter,
} from './sync-adapter';

const payload: LotPayload = {
  request: { id: 'l1', harvest_id: 'h1' },
  label: 'Lote de P05 · Lote del río · 14 oct.',
};

const item: QueueItem = {
  id: 'lot:l1',
  resource: 'lots',
  operation: 'create',
  parentId: 'harvest:h1',
  payload,
  status: 'syncing',
  createdAt: 0,
  updatedAt: 0,
};

const apiError = (status: number, code: string) =>
  new ApiError(status, {
    detail: 'Error de prueba.',
    code,
    fields: {},
  });

const conflict = (error: unknown) => lotSyncAdapter.parseConflict(error);

describe('lotSyncAdapter.send', () => {
  it('posts the request with the id of the device and returns the lot', async () => {
    let received: unknown;
    server.use(
      http.post(apiUrl('/api/lots'), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(buildLot({ id: 'l1' }), { status: 201 });
      }),
    );

    const response = await lotSyncAdapter.send(item);

    expect(received).toEqual({ id: 'l1', harvest_id: 'h1' });
    expect(response).toMatchObject({ id: 'l1' });
  });
});

describe('lotSyncAdapter.assignedCode', () => {
  it('tells the code the server gave to the lot', () => {
    expect(
      lotSyncAdapter.assignedCode?.(
        item,
        buildLot({ code: '000004-F03-P01-261016-1' }),
      ),
    ).toEqual({ kind: 'lot', code: '000004-F03-P01-261016-1' });
  });
});

describe('lotSyncAdapter.parseConflict', () => {
  it('retries without an answer from the server or with one that may change by itself', () => {
    expect(conflict(new TypeError('Failed to fetch'))).toBeNull();
    expect(conflict(apiError(503, 'internal_error'))).toBeNull();
    expect(conflict(apiError(429, 'throttled'))).toBeNull();
  });

  it('says the harvest is gone when the server does not find it', () => {
    expect(conflict(apiError(404, 'not_found'))).toEqual({
      code: LOT_HARVEST_GONE_CODE,
      message: LOT_HARVEST_GONE_MESSAGE,
    });
  });

  it('says another lot already formed from the harvest', () => {
    expect(conflict(apiError(409, 'harvest_already_in_lot'))).toEqual({
      code: 'harvest_already_in_lot',
      message: LOT_ALREADY_FORMED_MESSAGE,
    });
  });

  it('passes on the message of the server for the rest', () => {
    expect(conflict(apiError(409, 'lot_id_conflict'))).toEqual({
      code: 'lot_id_conflict',
      message: 'Error de prueba.',
    });
  });
});

describe('lotSyncAdapter.refreshAfterSync', () => {
  it('refreshes the harvests, which show their lot, and the lots', () => {
    expect(lotSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.harvests.all(),
      queryKeys.lots.all(),
    ]);
  });
});
