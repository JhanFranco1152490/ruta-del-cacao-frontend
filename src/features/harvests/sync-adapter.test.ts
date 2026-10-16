import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildHarvest } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import type { HarvestPayload } from './harvest-queue';
import {
  HARVEST_PLOT_GONE_CODE,
  HARVEST_PLOT_GONE_MESSAGE,
  harvestSyncAdapter,
  isCorrectableHarvestError,
  VARIETY_NOT_IN_PLOT_MESSAGE,
} from './sync-adapter';

const payload: HarvestPayload = {
  request: {
    id: 'h1',
    plot_id: 'pl1',
    harvest_date: '2026-10-14',
    green_weight_kg: '120.5',
    variety_id: 'v1',
    collector_id: 'u1',
  },
  label: 'P05 · Lote del río · 14 oct.',
};

const item: QueueItem = {
  id: 'harvest:h1',
  resource: 'harvests',
  operation: 'create',
  parentId: 'plot-characterization:pl1',
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

const conflict = (error: unknown) => harvestSyncAdapter.parseConflict(error);

describe('harvestSyncAdapter.send', () => {
  it('posts only the request, with the id of the device, and returns what the server answered', async () => {
    let received: unknown;
    server.use(
      http.post(apiUrl('/api/harvests'), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(buildHarvest(), { status: 201 });
      }),
    );

    const response = await harvestSyncAdapter.send(item);

    expect(received).toEqual(payload.request);
    expect(response).toMatchObject({ id: 'h1' });
  });
});

describe('harvestSyncAdapter.parseConflict', () => {
  it('retries without an answer from the server or with one that may change by itself', () => {
    expect(conflict(new TypeError('Failed to fetch'))).toBeNull();
    expect(conflict(apiError(503, { code: 'internal_error' }))).toBeNull();
    expect(conflict(apiError(429, { code: 'throttled' }))).toBeNull();
  });

  it('explains that the plot is gone instead of the generic not found', () => {
    expect(conflict(apiError(404, { code: 'not_found' }))).toEqual({
      code: HARVEST_PLOT_GONE_CODE,
      message: HARVEST_PLOT_GONE_MESSAGE,
    });
  });

  it('asks for another variety when it left the characterization', () => {
    expect(conflict(apiError(422, { code: 'variety_not_in_plot' }))).toEqual({
      code: 'variety_not_in_plot',
      message: VARIETY_NOT_IN_PLOT_MESSAGE,
    });
  });

  it('keeps the fields of a validation error to mark them when correcting', () => {
    expect(
      conflict(apiError(400, { fields: { green_weight_kg: ['Muy pesado.'] } })),
    ).toEqual({
      code: 'validation_error',
      message: 'Error de prueba.',
      data: { fields: { green_weight_kg: ['Muy pesado.'] } },
    });
  });

  it('passes on the message of the server for the rest', () => {
    expect(
      conflict(apiError(422, { code: 'collector_not_available' })),
    ).toEqual({
      code: 'collector_not_available',
      message: 'Error de prueba.',
      data: undefined,
    });
  });
});

describe('isCorrectableHarvestError', () => {
  it.each([
    'validation_error',
    'variety_not_in_plot',
    'collector_not_available',
    'plot_not_characterized',
  ])('lets %s be corrected', (code) => {
    expect(isCorrectableHarvestError(code)).toBe(true);
  });

  it.each([HARVEST_PLOT_GONE_CODE, 'harvest_id_conflict', undefined])(
    'only lets %s be discarded',
    (code) => {
      expect(isCorrectableHarvestError(code)).toBe(false);
    },
  );
});

describe('harvestSyncAdapter.refreshAfterSync', () => {
  it('refreshes every harvest read', () => {
    expect(harvestSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.harvests.all(),
    ]);
  });
});
