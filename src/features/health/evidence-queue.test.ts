// @vitest-environment node
// La foto viaja como `Blob` en la cola: en jsdom no sobrevive a IndexedDB ni al `fetch` de las
// pruebas, así que estas pruebas corren en el entorno `node`, como el navegador.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import {
  clearAdapters,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';
import { buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { controlQueueId } from './control-queue';
import {
  enqueueEvidence,
  EVIDENCE_RESOURCE,
  type EvidencePayload,
  evidenceQueueId,
  listQueuedEvidence,
} from './evidence-queue';
import { evidenceSyncAdapter } from './evidence-sync-adapter';
import { enqueueMonitoring, monitoringQueueId } from './monitoring-queue';
import { monitoringSyncAdapter } from './monitoring-sync-adapter';

const payload = (
  overrides: Partial<EvidencePayload> = {},
): EvidencePayload => ({
  id: 'e1',
  activityId: 'a1',
  kind: 'monitoring',
  blob: new Blob(['foto'], { type: 'image/jpeg' }),
  fileName: 'mazorca.jpg',
  capturedAt: '2026-10-19T15:20:00Z',
  label: 'P-03 · 19 de octubre',
  ...overrides,
});

let userId: string;

beforeEach(() => {
  userId = `evidence-queue-${crypto.randomUUID()}`;
});

describe('enqueueEvidence', () => {
  it('waits for the monitoring result it backs, if it is still in the queue', async () => {
    await enqueueEvidence(userId, payload());

    const item = await getOfflineDb(userId).queue.get(evidenceQueueId('e1'));
    expect(item).toMatchObject({
      resource: EVIDENCE_RESOURCE,
      operation: 'create',
      parentId: monitoringQueueId('a1'),
      status: 'pending',
    });
    expect(await (item?.payload as EvidencePayload).blob.text()).toBe('foto');
  });

  it('waits for the control it backs, if it is still in the queue', async () => {
    await enqueueEvidence(
      userId,
      payload({ kind: 'control', activityId: 'c1' }),
    );

    expect(
      (await getOfflineDb(userId).queue.get(evidenceQueueId('e1')))?.parentId,
    ).toBe(controlQueueId('c1'));
  });
});

describe('listQueuedEvidence', () => {
  it('lists the photos of an activity that wait in the device', async () => {
    await enqueueEvidence(userId, payload());
    await enqueueEvidence(userId, payload({ id: 'e2' }));
    await enqueueEvidence(userId, payload({ id: 'e3', activityId: 'a2' }));

    expect(
      (await listQueuedEvidence(userId, 'a1')).map(({ id }) => id).sort(),
    ).toEqual(['e1', 'e2']);
  });
});

const item = {
  id: evidenceQueueId('e1'),
  resource: EVIDENCE_RESOURCE,
  operation: 'create' as const,
  parentId: monitoringQueueId('a1'),
  payload: payload(),
  status: 'syncing' as const,
  createdAt: 0,
  updatedAt: 0,
};

const apiError = (status: number, code: string) =>
  new ApiError(status, { detail: 'Error de prueba.', code, fields: {} });
const conflict = (error: unknown) => evidenceSyncAdapter.parseConflict(error);

describe('evidenceSyncAdapter', () => {
  it('uploads the photo as a form, with its device id and the time it was taken', async () => {
    let received: Record<string, unknown> | undefined;
    server.use(
      http.post(
        apiUrl('/api/agricultural-activities/a1/evidence'),
        async ({ request }) => {
          const form = await request.formData();
          const file = form.get('file') as File;
          received = {
            id: form.get('id'),
            captured_at: form.get('captured_at'),
            name: file.name,
            content: await file.text(),
          };
          return HttpResponse.json({ id: 'e1' }, { status: 201 });
        },
      ),
    );

    await evidenceSyncAdapter.send(item);

    expect(received).toEqual({
      id: 'e1',
      captured_at: '2026-10-19T15:20:00Z',
      name: 'mazorca.jpg',
      content: 'foto',
    });
  });

  it('retries without a response, and while what it backs is not done yet', () => {
    expect(conflict(new TypeError('offline'))).toBeNull();
    expect(conflict(apiError(503, 'server_error'))).toBeNull();
    expect(conflict(apiError(409, 'evidence_requires_done'))).toBeNull();
  });

  it('sends to the tray what will not get better, with the message of the server', () => {
    for (const [status, code] of [
      [413, 'evidence_too_large'],
      [415, 'evidence_format_not_allowed'],
      [409, 'evidence_limit_reached'],
    ] as const) {
      expect(conflict(apiError(status, code))).toEqual({
        code,
        message: 'Error de prueba.',
      });
    }
    expect(conflict(apiError(404, 'not_found'))).toEqual({
      code: 'evidence_target_deleted',
      message: 'El monitoreo o control de esta foto ya no existe.',
    });
  });

  it('refreshes the photos of the activity and what shows how many there are', () => {
    expect(evidenceSyncAdapter.refreshAfterSync?.(item)).toEqual([
      queryKeys.health.evidence('a1'),
      queryKeys.agriculturalActivities.all(),
      queryKeys.health.all(),
    ]);
  });
});

describe('the order in the queue', () => {
  afterEach(() => clearAdapters());

  it('sends a photo after the monitoring result it backs', async () => {
    const order: string[] = [];
    server.use(
      http.post(apiUrl('/api/agricultural-activities/a1/monitoring'), () => {
        order.push('monitoring');
        return HttpResponse.json(
          buildAgriculturalActivity({ status: 'done' }),
          {
            status: 201,
          },
        );
      }),
      http.post(apiUrl('/api/agricultural-activities/a1/evidence'), () => {
        order.push('photo');
        return HttpResponse.json({ id: 'e1' }, { status: 201 });
      }),
    );
    registerAdapter(monitoringSyncAdapter);
    registerAdapter(evidenceSyncAdapter);
    // Se guardan sin conexión: la foto queda primero en la cola, pero espera a su monitoreo.
    await enqueueEvidence(userId, payload());
    await enqueueMonitoring(userId, 'a1', {
      request: {
        done_date: '2026-10-19',
        sampling_unit: 'trees',
        evaluated_units: 50,
        no_presence: true,
        detections: [],
      },
      label: 'P-03 · 19 de octubre',
    });

    await processQueue(userId);

    expect(order).toEqual(['monitoring', 'photo']);
    expect(await getOfflineDb(userId).queue.count()).toBe(0);
  });
});
