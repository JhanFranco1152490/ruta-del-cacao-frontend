import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { QueueItemExistsError } from '@/lib/offline/sync-queue';

import {
  enqueueFarmCreate,
  enqueueFarmUpdate,
  FARM_RESOURCE,
  getQueuedFarm,
  resubmitFarm,
} from './farm-queue';
import type { FarmFormValues } from './schemas';

const values: FarmFormValues = {
  name: 'La Esperanza',
  municipality_id: '54001',
  details: '',
  area_hectares: '12.50',
  altitude_masl: '950',
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

describe('enqueueFarmCreate', () => {
  it('stores the farm as a pending create with the API payload shape', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;

    await enqueueFarmCreate(userId, 'f1', values);

    const item = await getOfflineDb(userId).queue.get('f1');
    expect(item).toMatchObject({
      resource: FARM_RESOURCE,
      operation: 'create',
      status: 'pending',
      payload: {
        id: 'f1',
        name: 'La Esperanza',
        department_id: '54',
        municipality_id: '54001',
        details: '',
        area_hectares: '12.50',
        altitude_masl: 950,
        latitude: '7.8234567',
        longitude: '-72.5123456',
      },
    });
  });

  it('keeps a single farm when the same form is saved twice', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;

    await enqueueFarmCreate(userId, 'f1', values);
    await enqueueFarmCreate(userId, 'f1', { ...values, name: 'Otra' });

    expect(await getOfflineDb(userId).queue.count()).toBe(1);
  });
});

describe('enqueueFarmUpdate', () => {
  // Dos pestañas abiertas en el editor de la misma finca del servidor: la segunda en guardar no
  // debe creer que guardó mientras la cola conserva solo la primera edición.
  it('refuses a second edit of a farm that already has one waiting', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;
    await enqueueFarmUpdate(userId, 'f1', values, 3);

    await expect(
      enqueueFarmUpdate(userId, 'f1', { ...values, name: 'Otra' }, 3),
    ).rejects.toBeInstanceOf(QueueItemExistsError);
    expect(await getOfflineDb(userId).queue.get('f1')).toMatchObject({
      payload: { name: 'La Esperanza', expected_version: 3 },
    });
  });
});

describe('farms and the producer they are saved for', () => {
  const PRODUCER = '33333333-3333-4333-8333-333333333333';
  const forProducer = { ...values, producer_id: PRODUCER };

  it('keeps the producer the technical account chose in the pending create', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;

    await enqueueFarmCreate(userId, 'f1', forProducer);

    const item = await getOfflineDb(userId).queue.get('f1');
    expect(item?.payload).toMatchObject({ id: 'f1', producer_id: PRODUCER });
  });

  it('leaves it out when nobody chose one', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;

    await enqueueFarmCreate(userId, 'f1', values);

    const item = await getOfflineDb(userId).queue.get('f1');
    expect(item?.payload).not.toHaveProperty('producer_id');
  });

  it('never sends it with an edit: a farm does not change owner', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;

    await enqueueFarmUpdate(userId, 'f1', forProducer, 2);

    const item = await getOfflineDb(userId).queue.get('f1');
    expect(item?.payload).not.toHaveProperty('producer_id');
  });

  it('keeps it when a pending create is corrected', async () => {
    const userId = `farm-queue-${crypto.randomUUID()}`;
    await enqueueFarmCreate(userId, 'f1', forProducer);
    const queued = await getQueuedFarm(userId, 'f1');

    await resubmitFarm(userId, queued!, {
      ...forProducer,
      name: 'Otro nombre',
    });

    const item = await getOfflineDb(userId).queue.get('f1');
    expect(item?.payload).toMatchObject({
      name: 'Otro nombre',
      producer_id: PRODUCER,
    });
    expect(queued?.values.producer_id).toBe(PRODUCER);
  });
});
