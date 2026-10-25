import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildDryingLog } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import type { LogPayload } from './log-queue';
import {
  DRYING_FINISHED_MESSAGE,
  DRYING_GONE_MESSAGE,
  isCorrectableLogError,
  LOG_ALREADY_SENT_MESSAGE,
  logSyncAdapter,
} from './log-sync-adapter';

const payload: LogPayload = {
  lotId: 'l1',
  request: {
    id: 'dl1',
    measured_at: '2026-10-23T16:00:00-05:00',
    moisture_pct: '12.4',
    sun_hours: '6.0',
    shade_hours: null,
    turn_count: 2,
    turn_frequency_hours: '3.0',
    weather: 'sunny',
    notes: '',
    captured_at: '2026-10-23T21:01:00.000Z',
  },
  label: '000123-F02-P05-261014-1 · bitácora del día 2 · 23 oct',
};

const item: QueueItem = {
  id: 'drying-log:dl1',
  resource: 'drying-logs',
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

const conflict = (error: unknown) => logSyncAdapter.parseConflict(error);

describe('logSyncAdapter.send', () => {
  it('posts the log to its lot as it was captured, and returns what the server answered', async () => {
    let received: unknown;
    server.use(
      http.post(apiUrl('/api/drying/l1/logs'), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(buildDryingLog({ day_number: 2 }), {
          status: 201,
        });
      }),
    );

    const response = await logSyncAdapter.send(item);

    expect(received).toEqual(payload.request);
    expect(response).toMatchObject({ day_number: 2 });
  });
});

describe('logSyncAdapter.parseConflict', () => {
  it('retries without an answer from the server or with one that may change by itself', () => {
    expect(conflict(new TypeError('Failed to fetch'))).toBeNull();
    expect(conflict(apiError(503, { code: 'internal_error' }))).toBeNull();
    expect(conflict(apiError(401, { code: 'not_authenticated' }))).toBeNull();
  });

  it('explains that the drying is no longer reachable', () => {
    expect(conflict(apiError(404, { code: 'not_found' }))).toEqual({
      code: 'not_found',
      message: DRYING_GONE_MESSAGE,
    });
  });

  // Alguien lo finalizó desde otro teléfono mientras esta bitácora esperaba la señal.
  it('explains that the drying already finished', () => {
    expect(conflict(apiError(409, { code: 'drying_not_in_progress' }))).toEqual(
      { code: 'drying_not_in_progress', message: DRYING_FINISHED_MESSAGE },
    );
  });

  it('explains that a log that already reached the server with other data is only discarded', () => {
    expect(conflict(apiError(409, { code: 'drying_log_id_conflict' }))).toEqual(
      { code: 'drying_log_id_conflict', message: LOG_ALREADY_SENT_MESSAGE },
    );
  });

  it('keeps the field and the log already recorded on that date', () => {
    expect(
      conflict(
        apiError(409, {
          code: 'duplicate_drying_log_date',
          detail: 'Ya existe un registro para esta fecha',
          fields: { measured_at: ['Ya existe un registro para esta fecha'] },
          existing: { id: 'dl0', day_number: 2 },
        }),
      ),
    ).toEqual({
      code: 'duplicate_drying_log_date',
      message: 'Ya existe un registro para esta fecha',
      data: {
        fields: { measured_at: ['Ya existe un registro para esta fecha'] },
        existing: { id: 'dl0', day_number: 2 },
      },
    });
  });

  it('keeps the fields of a validation error to mark them when correcting', () => {
    expect(
      conflict(apiError(400, { fields: { sun_hours: ['Máximo 24 horas'] } })),
    ).toEqual({
      code: 'validation_error',
      message: 'Error de prueba.',
      data: { fields: { sun_hours: ['Máximo 24 horas'] } },
    });
  });
});

describe('isCorrectableLogError', () => {
  it.each(['validation_error', 'duplicate_drying_log_date'])(
    'lets %s be corrected',
    (code) => {
      expect(isCorrectableLogError(code)).toBe(true);
    },
  );

  it.each([
    'drying_not_in_progress',
    'not_found',
    'drying_log_id_conflict',
    undefined,
  ])('only lets %s be discarded', (code) => {
    expect(isCorrectableLogError(code)).toBe(false);
  });
});

describe('logSyncAdapter.refreshAfterSync', () => {
  it('refreshes every drying read, the list and the lot detail', () => {
    expect(logSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.drying.all(),
    ]);
  });
});
