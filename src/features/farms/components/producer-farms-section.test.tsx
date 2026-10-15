import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildFarm, buildSession } from '@/test/factories';
import { farmsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { http } from 'msw';
import { apiUrl } from '@/test/handlers';

import { ProducerFarmStats, ProducerFarmsList } from './producer-farms-section';

function renderSection(permissions: string[] = [PERMISSIONS.FARMS_VIEW]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ permissions }));
  return renderWithProviders(
    <>
      <ProducerFarmStats producerId="p1" />
      <ProducerFarmsList producerId="p1" />
    </>,
    { queryClient },
  );
}

describe('ProducerFarmsList and ProducerFarmStats', () => {
  it('summarizes the farms of the producer and links each one to its detail', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      farmsHandler(
        [
          buildFarm({
            id: 'f1',
            name: 'La Esperanza',
            area_hectares: '10.00',
            allocated_area_hectares: '4.00',
          }),
          buildFarm({
            id: 'f2',
            name: 'El Porvenir',
            area_hectares: '30.00',
            allocated_area_hectares: '0.00',
            is_active: false,
          }),
        ],
        requests,
      ),
    );
    renderSection();

    expect(
      await screen.findByRole('heading', {
        name: 'Fincas de este productor · 2',
      }),
    ).toBeInTheDocument();
    expect(requests[0].get('producer')).toBe('p1');
    expect(screen.getByText('40 ha')).toBeInTheDocument();
    expect(screen.getByText('10 % del área')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /El Porvenir/ });
    expect(within(row).getByText('Inactiva')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver detalle de La Esperanza' }),
    ).toHaveAttribute('href', '/fincas/detalle?id=f1');
    expect(screen.getByRole('link', { name: 'Ver en Fincas' })).toHaveAttribute(
      'href',
      '/fincas?productor=p1',
    );
  });

  it('offers to register a farm only with the permission', async () => {
    server.use(farmsHandler([buildFarm()]));
    const first = renderSection();
    await screen.findByRole('table', { name: 'Fincas del productor' });
    expect(
      screen.queryByRole('link', { name: /Registrar finca/ }),
    ).not.toBeInTheDocument();
    first.unmount();

    renderSection([PERMISSIONS.FARMS_VIEW, PERMISSIONS.FARMS_ADD]);
    expect(
      await screen.findByRole('link', { name: /Registrar finca/ }),
    ).toHaveAttribute('href', '/fincas/nueva');
  });

  it('says so when the producer has no farms yet', async () => {
    server.use(farmsHandler([]));
    renderSection();

    expect(
      await screen.findByText('Este productor aún no tiene fincas'),
    ).toBeInTheDocument();
  });

  it('is not shown to someone who cannot see farms', async () => {
    server.use(farmsHandler([buildFarm()]));
    const { container } = renderSection([PERMISSIONS.PRODUCERS_VIEW]);

    expect(container).toBeEmptyDOMElement();
  });

  it('offers to retry when the farms could not be loaded', async () => {
    server.use(
      http.get(apiUrl('/api/farms'), () =>
        apiError(500, 'server_error', 'Falló.'),
      ),
    );
    renderSection();

    expect(
      await screen.findByText(
        'No fue posible cargar las fincas del productor.',
        undefined,
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
