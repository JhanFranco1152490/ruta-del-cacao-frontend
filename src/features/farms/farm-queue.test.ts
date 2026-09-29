import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';

import { enqueueFarmCreate, FARM_RESOURCE } from './farm-queue';
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
