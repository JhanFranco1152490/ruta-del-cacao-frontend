import { beforeEach, describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { discard, QueueItemHasDependentsError } from '@/lib/offline/sync-queue';

import { buildPlot, buildVertex } from '@/test/factories';

import {
  CREATED_PLOT_VERSION,
  enqueuePlotCreate,
  enqueuePlotUpdate,
  getQueuedPlot,
  listQueuedPlots,
  plotToFormValues,
  resubmitPlot,
  type PlotFormValues,
} from './plot-queue';
import type { DraftVertex } from './plot-vertices';

const vertices: DraftVertex[] = [
  {
    latitude: 7.8,
    longitude: -72.5,
    source: 'map',
    accuracyM: null,
    capturedAt: null,
  },
  {
    latitude: 7.8,
    longitude: -72.499,
    source: 'map',
    accuracyM: null,
    capturedAt: null,
  },
  {
    latitude: 7.801,
    longitude: -72.499,
    source: 'gps',
    accuracyM: 5,
    capturedAt: null,
  },
];

const values: PlotFormValues = {
  code: 'P1 · El Mango',
  area_hectares: '2.40',
  vertices,
};

let userId: string;

beforeEach(() => {
  userId = `plot-queue-${crypto.randomUUID()}`;
});

describe('enqueuePlotCreate', () => {
  it('saves the plot with its device id, its farm as parent and its boundary as the API wants it', async () => {
    await enqueuePlotCreate(userId, 'pl1', 'f1', values);

    const item = await getOfflineDb(userId).queue.get('pl1');
    expect(item).toMatchObject({
      resource: 'plots',
      operation: 'create',
      parentId: 'f1',
      status: 'pending',
    });
    expect(item?.payload).toMatchObject({
      id: 'pl1',
      farm_id: 'f1',
      code: 'P1 · El Mango',
      area_hectares: '2.40',
    });
    expect((item?.payload as { boundary: unknown[] }).boundary).toHaveLength(3);
  });

  it('saves a plot without vertices with a null boundary', async () => {
    await enqueuePlotCreate(userId, 'pl1', 'f1', { ...values, vertices: [] });

    const item = await getOfflineDb(userId).queue.get('pl1');
    expect((item?.payload as { boundary: unknown }).boundary).toBeNull();
  });

  it('does not duplicate when the same form is saved twice', async () => {
    await enqueuePlotCreate(userId, 'pl1', 'f1', values);
    await enqueuePlotCreate(userId, 'pl1', 'f1', values);

    expect(await getOfflineDb(userId).queue.count()).toBe(1);
  });

  it('keeps the farm from being discarded while its plot is waiting', async () => {
    await getOfflineDb(userId).queue.add({
      id: 'f1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'pending',
      createdAt: 1,
      updatedAt: 1,
    });
    await enqueuePlotCreate(userId, 'pl1', 'f1', values);

    await expect(discard(userId, 'f1')).rejects.toBeInstanceOf(
      QueueItemHasDependentsError,
    );
  });
});

describe('enqueuePlotUpdate', () => {
  it('saves the edit of a server plot with the version that was read', async () => {
    await enqueuePlotUpdate(userId, 'pl1', 'f1', values, 4);

    const queued = await getQueuedPlot(userId, 'pl1');
    expect(queued).toMatchObject({
      id: 'pl1',
      farmId: 'f1',
      operation: 'update',
      expectedVersion: 4,
      status: 'pending',
    });
    expect(queued?.values.vertices).toHaveLength(3);
  });

  it('refuses a second edit while one is waiting instead of losing it silently', async () => {
    await enqueuePlotUpdate(userId, 'pl1', 'f1', values, 1);

    await expect(
      enqueuePlotUpdate(userId, 'pl1', 'f1', { ...values, code: 'Otro' }, 1),
    ).rejects.toThrow();
  });
});

describe('queued plots of a farm', () => {
  it('lists only the plots of that farm, not its other queued records', async () => {
    await enqueuePlotCreate(userId, 'pl1', 'f1', values);
    await enqueuePlotCreate(userId, 'pl2', 'f2', values);
    await getOfflineDb(userId).queue.add({
      id: 'f1',
      resource: 'farms',
      operation: 'update',
      parentId: 'f1',
      payload: {},
      status: 'pending',
      createdAt: 1,
      updatedAt: 1,
    });

    const plots = await listQueuedPlots(userId, 'f1');

    expect(plots.map((plot) => plot.id)).toEqual(['pl1']);
  });

  it('knows nothing of an id that belongs to another resource', async () => {
    await getOfflineDb(userId).queue.add({
      id: 'f1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'pending',
      createdAt: 1,
      updatedAt: 1,
    });

    expect(await getQueuedPlot(userId, 'f1')).toBeNull();
  });
});

describe('resubmitPlot', () => {
  it('replaces the content, clears the error and returns the plot to pending', async () => {
    await enqueuePlotCreate(userId, 'pl1', 'f1', values);
    await getOfflineDb(userId).queue.update('pl1', {
      status: 'error',
      errorCode: 'plot_overlap',
      errorMessage: 'Se superpone.',
      errorData: { suggested_boundary: [] },
    });
    const queued = (await getQueuedPlot(userId, 'pl1'))!;
    expect(queued.errorData).toEqual({ suggested_boundary: [] });

    await resubmitPlot(userId, queued, { ...values, area_hectares: '2.00' });

    const fixed = (await getQueuedPlot(userId, 'pl1'))!;
    expect(fixed).toMatchObject({ status: 'pending', farmId: 'f1' });
    expect(fixed.values.area_hectares).toBe('2.00');
    expect(fixed.errorCode).toBeUndefined();
    expect(fixed.errorData).toBeUndefined();
  });

  it('can resend an edit with the current version of the server plot', async () => {
    await enqueuePlotUpdate(userId, 'pl1', 'f1', values, 1);
    const queued = (await getQueuedPlot(userId, 'pl1'))!;

    await resubmitPlot(userId, queued, values, 5);

    expect((await getQueuedPlot(userId, 'pl1'))?.expectedVersion).toBe(5);
  });
});

describe('plotToFormValues', () => {
  it('turns a server plot into the form values, with its vertices', () => {
    const plot = buildPlot({
      code: 'P1',
      area_hectares: '2.40',
      boundary: [
        buildVertex('-72.5000000', '7.8000000'),
        buildVertex('-72.4990000', '7.8000000'),
        buildVertex('-72.4990000', '7.8010000'),
      ],
    });

    expect(plotToFormValues(plot)).toMatchObject({
      code: 'P1',
      area_hectares: '2.40',
    });
    expect(plotToFormValues(plot).vertices).toHaveLength(3);
  });

  it('the version a device-created plot is edited against is the creation one', () => {
    expect(CREATED_PLOT_VERSION).toBe(1);
  });
});
