import { describe, expect, it } from 'vitest';

import { buildFarmMapPoint } from '@/test/factories';

import type { FarmListItem } from './farm-list-item';
import { farmMapPoints, withLocalCounts } from './farm-map-data';

const local = (overrides: Partial<FarmListItem>): FarmListItem => ({
  id: 'l1',
  name: 'Local',
  municipalityCode: '54810',
  details: '',
  areaHectares: '1',
  location: { latitude: '8.6', longitude: '-72.7' },
  status: 'pending',
  queuedAs: 'create',
  ...overrides,
});

describe('withLocalCounts', () => {
  it('adds the farms created on the device to their municipality', () => {
    expect(
      withLocalCounts(
        [{ municipality_id: '54810', farm_count: 2 }],
        [local({}), local({ id: 'l2', municipalityCode: '54001' })],
      ),
    ).toEqual([
      { code: '54001', count: 1 },
      { code: '54810', count: 3 },
    ]);
  });

  it('does not count a pending edit twice', () => {
    expect(
      withLocalCounts(
        [{ municipality_id: '54810', farm_count: 2 }],
        [local({ queuedAs: 'update' })],
      ),
    ).toEqual([{ code: '54810', count: 2 }]);
  });
});

describe('farmMapPoints', () => {
  it('puts device farms first and their server copies away', () => {
    const points = farmMapPoints(
      [
        buildFarmMapPoint({ id: 'l1', name: 'Vieja' }),
        buildFarmMapPoint({ id: 's1' }),
      ],
      [local({ name: 'Nueva', queuedAs: 'update' })],
      '54810',
      { showProducer: false },
    );

    expect(points.map((point) => point.label)).toEqual([
      'Nueva',
      'La Esperanza',
    ]);
    expect(points[0]).toMatchObject({
      tone: 'info',
      detail: 'Pendiente de sincronización',
    });
  });

  it('hides the server copy of a farm moved to another municipality', () => {
    const points = farmMapPoints(
      [buildFarmMapPoint({ id: 'l1' })],
      [local({ municipalityCode: '54001', queuedAs: 'update' })],
      '54810',
      { showProducer: false },
    );

    expect(points).toEqual([]);
  });

  it('names the producer only when asked', () => {
    const server = [buildFarmMapPoint({ is_active: false })];

    expect(
      farmMapPoints(server, [], '54810', { showProducer: true })[0].detail,
    ).toBe('Inactiva · Ana Rojas');
    expect(
      farmMapPoints(server, [], '54810', { showProducer: false })[0].detail,
    ).toBe('Inactiva');
  });
});
