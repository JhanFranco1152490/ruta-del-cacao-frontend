import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildFarm, buildSession } from '@/test/factories';
import { apiUrl, farmHandler, municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { enqueueFarmCreate, enqueueFarmUpdate } from '../farm-queue';
import type { FarmFormValues } from '../schemas';
import { FarmDetailScreen, type FarmPlotsContext } from './farm-detail-screen';

const queued: FarmFormValues = {
  name: 'Finca del teléfono',
  municipality_id: '54001',
  details: '',
  area_hectares: '4.00',
  altitude_masl: '',
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

let userId: string;

beforeEach(async () => {
  userId = `farm-detail-${crypto.randomUUID()}`;
  await recordLogin(userId);
  server.use(municipalitiesHandler());
});

function renderScreen({
  id = 'f1',
  permissions = [PERMISSIONS.FARMS_VIEW, PERMISSIONS.FARMS_CHANGE] as string[],
  seen = [] as FarmPlotsContext[],
  // `null`: una cuenta sin productor propio (la asociación o la cuenta técnica).
  producerId = 'p1' as string | null,
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions, producer_id: producerId }),
  );
  return renderWithProviders(
    <FarmDetailScreen
      id={id}
      renderPlots={(farm) => {
        seen.push(farm);
        return <p>Parcelas de {farm.name}</p>;
      }}
    />,
    { queryClient },
  );
}

describe('FarmDetailScreen', () => {
  it('shows the farm, its state and what the plots section needs', async () => {
    server.use(
      farmHandler(
        buildFarm({
          name: 'La Esperanza',
          area_hectares: '10.00',
          allocated_area_hectares: '6.00',
        }),
      ),
    );
    const seen: FarmPlotsContext[] = [];
    renderScreen({ seen });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'La Esperanza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cúcuta, Norte de Santander')).toBeInTheDocument();
    expect(screen.getByText('10 ha')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('Parcelas de La Esperanza')).toBeInTheDocument();
    expect(seen.at(-1)).toMatchObject({
      id: 'f1',
      areaHectares: '10.00',
      allocatedAreaHectares: '6.00',
      isActive: true,
    });
  });

  it('offers to edit the farm only with the permission to change it', async () => {
    server.use(farmHandler(buildFarm()));
    renderScreen();

    expect(
      await screen.findByRole('link', { name: /Editar finca/ }),
    ).toHaveAttribute('href', '/fincas/editar?id=f1');
  });

  it('lets the association look without editing', async () => {
    server.use(farmHandler(buildFarm()));
    renderScreen({ permissions: [PERMISSIONS.FARMS_VIEW] });

    await screen.findByRole('heading', { level: 1, name: 'La Esperanza' });
    expect(
      screen.queryByRole('link', { name: /Editar finca/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the saved copy with its date when the server is unreachable', async () => {
    server.use(farmHandler(buildFarm({ name: 'Copia guardada' })));
    const first = renderScreen();
    await first.findByRole('heading', { name: 'Copia guardada' });
    first.unmount();

    server.use(http.get(apiUrl('/api/farms/f1'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Copia guardada' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Datos guardados el/)).toBeInTheDocument();
  });

  it('asks for a connection when the farm was never opened before', async () => {
    server.use(http.get(apiUrl('/api/farms/f1'), () => HttpResponse.error()));
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'necesitas conexión para verla',
    );
    expect(
      screen.getByRole('link', { name: 'Volver a mis fincas' }),
    ).toHaveAttribute('href', '/fincas');
  });

  it('says so when the farm is not among the persons own', async () => {
    server.use(
      http.get(apiUrl('/api/farms/f1'), () =>
        apiError(404, 'not_found', 'No encontrado.'),
      ),
    );
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos esta finca entre las tuyas.',
    );
  });

  it('builds a farm that is only on the device from the queue, with its pending plots section', async () => {
    await enqueueFarmCreate(userId, 'local-1', queued);
    const seen: FarmPlotsContext[] = [];
    renderScreen({ id: 'local-1', seen });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Finca del teléfono',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pendiente de sincronización')).toBeInTheDocument();
    expect(
      screen.getByText(/está solo en este dispositivo/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Parcelas de Finca del teléfono'),
    ).toBeInTheDocument();
    expect(seen.at(-1)).toMatchObject({ isPendingCreate: true });
    expect(seen.at(-1)?.allocatedAreaHectares).toBeUndefined();
  });

  it('shows the plots of a farm whose edit is still pending', async () => {
    await enqueueFarmUpdate(
      userId,
      'f1',
      { ...queued, name: 'Nombre nuevo' },
      1,
    );
    const seen: FarmPlotsContext[] = [];
    renderScreen({ seen });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nombre nuevo' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/cambios en este dispositivo/)).toBeInTheDocument();
    await waitFor(() => expect(seen.at(-1)?.name).toBe('Nombre nuevo'));
    expect(seen.at(-1)?.allocatedAreaHectares).toBeUndefined();
  });
});

describe('FarmDetailScreen and the producer of the farm', () => {
  it('says whose farm it is to an account without a producer of its own, with no way to change it', async () => {
    server.use(farmHandler(buildFarm({ id: 'f1', name: 'La Esperanza' })));
    renderScreen({
      permissions: [
        PERMISSIONS.FARMS_VIEW,
        PERMISSIONS.FARMS_CHANGE,
        PERMISSIONS.PRODUCERS_VIEW,
      ],
      producerId: null,
    });

    expect(
      await screen.findByRole('link', { name: 'Ana Prueba · PROD-000007' }),
    ).toHaveAttribute('href', '/productores/p1');
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
  });

  it('does not say it to the producer itself', async () => {
    server.use(farmHandler(buildFarm({ id: 'f1', name: 'La Esperanza' })));
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'La Esperanza' }),
    ).toBeVisible();
    expect(screen.queryByText(/Productor:/)).not.toBeInTheDocument();
  });
});
