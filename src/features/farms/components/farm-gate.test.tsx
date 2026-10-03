import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { buildFarm, buildSession } from '@/test/factories';
import { apiUrl, farmHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { enqueueFarmCreate } from '../farm-queue';
import { FarmGate, type GatedFarm } from './farm-gate';

let userId: string;

beforeEach(async () => {
  userId = `farm-gate-${crypto.randomUUID()}`;
  await recordLogin(userId);
});

function renderGate(id = 'f1') {
  const seen: GatedFarm[] = [];
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions: [PERMISSIONS.FARMS_VIEW] }),
  );
  renderWithProviders(
    <FarmGate id={id}>
      {(farm) => {
        seen.push(farm);
        return <p>Finca lista: {farm.name}</p>;
      }}
    </FarmGate>,
    { queryClient },
  );
  return seen;
}

describe('FarmGate', () => {
  it('gives the server farm with its allocated area', async () => {
    server.use(
      farmHandler(
        buildFarm({ allocated_area_hectares: '6.00', area_hectares: '10.00' }),
      ),
    );
    const seen = renderGate();

    expect(
      await screen.findByText('Finca lista: La Esperanza'),
    ).toBeInTheDocument();
    expect(seen.at(-1)).toMatchObject({
      id: 'f1',
      areaHectares: '10.00',
      allocatedAreaHectares: '6.00',
      isPendingCreate: false,
    });
  });

  it('gives a farm that is only on the device as pending, without an allocated area', async () => {
    await enqueueFarmCreate(userId, 'local-1', {
      name: 'Finca del teléfono',
      municipality_id: '54001',
      details: '',
      area_hectares: '4.00',
      altitude_masl: '',
      latitude: '7.8',
      longitude: '-72.5',
    });
    const seen = renderGate('local-1');

    expect(
      await screen.findByText('Finca lista: Finca del teléfono'),
    ).toBeInTheDocument();
    expect(seen.at(-1)).toMatchObject({ isPendingCreate: true });
    expect(seen.at(-1)?.allocatedAreaHectares).toBeUndefined();
  });

  it('explains when the farm cannot be opened', async () => {
    server.use(http.get(apiUrl('/api/farms/f1'), () => HttpResponse.error()));
    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'necesitas conexión para verla',
    );
  });
});
