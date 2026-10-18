import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildFacility, buildFarm, buildSession } from '@/test/factories';
import { apiUrl, facilitiesHandler, farmsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { rememberLastFarm } from '../last-farm';
import { FacilitiesScreen } from './facilities-screen';

const esperanzaFarm = buildFarm({
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
});
const divisoFarm = buildFarm({ id: 'f2', code: 'F02', name: 'El Diviso' });
const esperanza = {
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
  is_active: true,
};
const diviso = { id: 'f2', code: 'F02', name: 'El Diviso', is_active: true };

const facilities = [
  buildFacility({ id: 'c10', name: 'C-10', farm: esperanza }),
  buildFacility({ id: 'c2', name: 'C-2', farm: esperanza, capacity_kg: 450 }),
  buildFacility({
    id: 'c3',
    name: 'C-3',
    farm: esperanza,
    status: 'occupied',
    has_records: true,
    occupied_by: {
      lot: { id: 'l1', code: '000123-F01-P05-261014-1', status: 'fermenting' },
      since: '2026-10-19T12:30:00Z',
    },
  }),
  buildFacility({
    id: 'm1',
    name: 'M-01',
    farm: esperanza,
    facility_type: 'solar_dryer',
    is_active: false,
    status: 'inactive',
  }),
  buildFacility({ id: 'd1', name: 'C-01', farm: diviso }),
];

let userId: string;
let facilityRequests: URLSearchParams[];

beforeEach(() => {
  userId = `facilities-screen-${crypto.randomUUID()}`;
  facilityRequests = [];
  resetLocation();
  server.use(
    farmsHandler([esperanzaFarm, divisoFarm]),
    facilitiesHandler(facilities, facilityRequests),
  );
});

afterEach(() => window.localStorage.clear());

function renderScreen({
  searchParams = '',
  superuser = false,
  onUrlUpdate,
}: {
  searchParams?: string;
  superuser?: boolean;
  onUrlUpdate?: OnUrlUpdateFunction;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      is_superuser: superuser,
      permissions: [PERMISSIONS.FACILITIES_VIEW],
    }),
  );
  return renderWithProviders(<FacilitiesScreen />, {
    queryClient,
    searchParams,
    onUrlUpdate,
  });
}

const rows = () =>
  within(screen.getByRole('table', { name: 'Cajones y marquesinas' }))
    .getAllByRole('row')
    .slice(1);

describe('FacilitiesScreen', () => {
  it('asks for the farm the first time, and opens the one chosen', async () => {
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: /F02 · El Diviso/ }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Infraestructura · F02 · El Diviso',
      }),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it('enters the remembered farm directly', async () => {
    rememberLastFarm(userId, 'f2');

    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Infraestructura · F02 · El Diviso',
      }),
    ).toBeInTheDocument();
  });

  it('lists the facilities of the farm, boxes first and in natural order', async () => {
    renderScreen({ searchParams: '?finca=f1' });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(
      rows().map((row) => within(row).getAllByRole('cell')[0].textContent),
    ).toEqual(['C-2', 'C-3', 'C-10', 'M-01']);
    const [c2] = rows();
    expect(c2).toHaveTextContent('Cajón');
    expect(c2).toHaveTextContent('450 kg');
    expect(c2).toHaveTextContent('Disponible');
    expect(
      screen.getByText('4 elementos · ordenados por tipo y nombre'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Un elemento inactivo no se ofrece al iniciar fermentaciones o secados. Su historial se conserva.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the lot that occupies a facility and since when', async () => {
    renderScreen({ searchParams: '?finca=f1' });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    const occupied = rows()[1];
    expect(occupied).toHaveTextContent('Ocupado');
    expect(occupied).toHaveTextContent('000123-F01-P05-261014-1');
    expect(occupied).toHaveTextContent('desde el 19 oct');
    expect(rows()[3]).toHaveTextContent('Inactiva');
  });

  it('summarizes the farm in three cards', async () => {
    renderScreen({ searchParams: '?finca=f1' });

    const summary = await screen.findByRole('region', {
      name: 'Resumen de la finca',
    });
    expect(summary).toHaveTextContent('Cajones disponibles');
    expect(summary).toHaveTextContent('2 de 3 activos');
    expect(summary).toHaveTextContent('1 ocupado');
    expect(summary).toHaveTextContent('0 de 0 activas');
    expect(summary).toHaveTextContent('1 inactiva');
    expect(summary).toHaveTextContent('000123-F01-P05-261014-1 en C-3');
  });

  it('filters the list and the cards from the URL', async () => {
    renderScreen({
      searchParams: '?finca=f1&tipo=fermentation_box&estado=available',
    });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(rows()).toHaveLength(2);
    expect(
      screen.getByRole('region', { name: 'Resumen de la finca' }),
    ).toHaveTextContent('Ninguno');
  });

  it('says when no facility matches, and clears the filters', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({
      searchParams: '?finca=f1&tipo=solar_dryer&estado=available',
      onUrlUpdate,
    });

    expect(
      await screen.findByRole('heading', {
        name: 'No se encontraron elementos',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ninguna marquesina disponible.'),
    ).toBeInTheDocument();

    const [clear] = screen.getAllByRole('button', { name: 'Limpiar filtros' });
    await userEvent.click(clear);

    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?finca=f1');
  });

  it('says when the farm has no facilities yet', async () => {
    server.use(facilitiesHandler([]));

    renderScreen({ searchParams: '?finca=f1' });

    expect(
      await screen.findByRole('heading', {
        name: 'La Esperanza aún no tiene cajones ni marquesinas',
      }),
    ).toBeInTheDocument();
  });

  it('goes back to choosing the farm, keeping the filters', async () => {
    renderScreen({ searchParams: '?finca=f1&tipo=solar_dryer' });

    expect(await screen.findByRole('link', { name: 'Fincas' })).toHaveAttribute(
      'href',
      '/infraestructura?tipo=solar_dryer&elegir=1',
    );
  });

  it('does not offer going back to whoever has a single farm', async () => {
    server.use(farmsHandler([esperanzaFarm]));

    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Infraestructura · F01 · La Esperanza',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fincas' })).toBeNull();
  });

  it('says there are no active farms', async () => {
    server.use(farmsHandler([buildFarm({ is_active: false })]));

    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Aún no tienes fincas activas.',
      }),
    ).toBeInTheDocument();
  });

  it('shows the saved copy without a connection, with its date', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'postharvest-facilities',
      value: facilities,
      fetchedAt: 1_760_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/postharvest-facilities'), () =>
        HttpResponse.error(),
      ),
    );

    renderScreen({ searchParams: '?finca=f1' });

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toHaveTextContent('Registrar o cambiar un elemento necesita conexión.');
    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(rows()).toHaveLength(4);
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(
      http.get(apiUrl('/api/postharvest-facilities'), () =>
        HttpResponse.error(),
      ),
    );

    renderScreen({ searchParams: '?finca=f1' });

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar la infraestructura.',
      }),
    ).toBeInTheDocument();
  });

  it('asks the technical account for a producer first', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByText(
        'Elige un productor para ver los cajones y marquesinas de sus fincas.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(facilityRequests).toEqual([]));
  });

  it('reads the facilities of the producer the technical account chose', async () => {
    renderScreen({ superuser: true, searchParams: '?productor=p7&finca=f1' });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(facilityRequests[0].get('producer')).toBe('p7');
  });
});
