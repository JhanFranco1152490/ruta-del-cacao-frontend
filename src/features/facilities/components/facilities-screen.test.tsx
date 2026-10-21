import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildFacility, buildFarm, buildSession } from '@/test/factories';
import {
  apiUrl,
  csrfHandler,
  facilitiesHandler,
  farmsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
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
  buildFacility({
    id: 'c2',
    name: 'C-2',
    farm: esperanza,
    capacity_kg: '450.0',
  }),
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

const lotHref = (id: string) => `/lotes/detalle?id=${id}`;

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

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function renderScreen({
  searchParams = '',
  superuser = false,
  onUrlUpdate,
  permissions = [PERMISSIONS.FACILITIES_VIEW],
}: {
  searchParams?: string;
  superuser?: boolean;
  onUrlUpdate?: OnUrlUpdateFunction;
  permissions?: string[];
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      is_superuser: superuser,
      permissions,
    }),
  );
  return renderWithProviders(<FacilitiesScreen lotHref={lotHref} />, {
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
  it('opens the first farm the first time, and changes farm from the same screen', async () => {
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Infraestructura · F01 · La Esperanza',
      }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Finca' }));
    await userEvent.click(
      await screen.findByRole('option', { name: /F02 · El Diviso/ }),
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

  it('says in the selector what each farm has', async () => {
    renderScreen({ searchParams: '?finca=f1' });

    await userEvent.click(
      await screen.findByRole('combobox', { name: 'Finca' }),
    );

    expect(
      await screen.findByRole('option', { name: /F02 · El Diviso/ }),
    ).toHaveTextContent('1 cajón');
  });

  it('offers no selector to whoever has a single farm', async () => {
    server.use(farmsHandler([esperanzaFarm]));

    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Infraestructura · F01 · La Esperanza',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Finca' })).toBeNull();
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

  it('opens the sheet of a facility touching its card on a phone', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ searchParams: '?finca=f1', onUrlUpdate });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver C-2' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Cajón C-2' }),
    ).toHaveTextContent('450 kg de cacao en baba');
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
      '?finca=f1&elemento=c2',
    );
  });

  it('opens a facility from the URL in its own farm', async () => {
    rememberLastFarm(userId, 'f1');

    renderScreen({ searchParams: '?elemento=d1' });

    expect(
      await screen.findByRole('dialog', { name: 'Cajón C-01' }),
    ).toBeInTheDocument();
    expect(
      // La hoja abierta deja el resto de la pantalla fuera del alcance de los lectores de pantalla.
      screen.getByRole('heading', {
        hidden: true,
        level: 1,
        name: 'Infraestructura · F02 · El Diviso',
      }),
    ).toBeInTheDocument();
  });

  it('closes the sheet and forgets the facility in the URL', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ searchParams: '?finca=f1&elemento=c2', onUrlUpdate });

    await screen.findByRole('dialog', { name: 'Cajón C-2' });
    await userEvent.keyboard('{Escape}');

    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?finca=f1');
  });

  describe('on a wide screen', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
    });

    it('highlights the facility of the URL instead of opening a sheet', async () => {
      renderScreen({ searchParams: '?finca=f1&elemento=c2' });

      await screen.findByRole('table', { name: 'Cajones y marquesinas' });
      expect(rows()[0]).toHaveAttribute('data-state', 'selected');
      expect(rows()[1]).not.toHaveAttribute('data-state');
      expect(screen.queryByRole('dialog', { name: 'Cajón C-2' })).toBeNull();
    });
  });

  it('registers a facility from the header, starting in the farm of the list', async () => {
    renderScreen({
      searchParams: '?finca=f2',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.FACILITIES_ADD],
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Registrar elemento' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Registrar elemento',
    });
    expect(within(dialog).getByRole('combobox', { name: 'Finca' })).toHaveValue(
      'F02 · El Diviso',
    );
  });

  it('does not offer registering without the permission', async () => {
    renderScreen({ searchParams: '?finca=f1' });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(
      screen.queryByRole('button', { name: 'Registrar elemento' }),
    ).toBeNull();
  });

  it('edits a facility from the menu of its row', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    renderScreen({
      searchParams: '?finca=f1',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.FACILITIES_CHANGE],
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Más acciones de C-2' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Editar' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Editar cajón C-2' }),
    ).toBeInTheDocument();
  });

  it('offers activating, deactivating and deleting by permission and status', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    renderScreen({
      searchParams: '?finca=f1',
      permissions: [
        PERMISSIONS.FACILITIES_VIEW,
        PERMISSIONS.FACILITIES_CHANGE,
        PERMISSIONS.FACILITIES_DELETE,
      ],
    });

    const menuItems = async (name: string) => {
      await userEvent.click(
        await screen.findByRole('button', { name: `Más acciones de ${name}` }),
      );
      const items = (await screen.findAllByRole('menuitem')).map((item) => [
        item.textContent,
        item.getAttribute('aria-disabled') === 'true',
      ]);
      await userEvent.keyboard('{Escape}');
      return items;
    };

    expect(await menuItems('C-2')).toEqual([
      ['Editar', false],
      ['Desactivar', false],
      ['Eliminar', false],
    ]);
    expect(await menuItems('M-01')).toEqual([
      ['Editar', false],
      ['Activar', false],
      ['Eliminar', false],
    ]);
    expect(await menuItems('C-3')).toEqual([
      ['Editar', false],
      ['DesactivarEstá ocupado por 000123-F01-P05-261014-1', true],
    ]);
  });

  it('deactivates a facility from its row and tells it', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    server.use(
      csrfHandler,
      http.patch(apiUrl('/api/postharvest-facilities/c2'), () =>
        HttpResponse.json(facilities[1]),
      ),
    );
    renderScreen({
      searchParams: '?finca=f1',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.FACILITIES_CHANGE],
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Más acciones de C-2' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Desactivar' }),
    );
    await userEvent.click(
      within(
        await screen.findByRole('dialog', {
          name: '¿Desactivar el cajón C-2?',
        }),
      ).getByRole('button', { name: 'Desactivar' }),
    );

    expect(
      await screen.findByText('Cajón C-2 desactivado'),
    ).toBeInTheDocument();
  });

  it('links the lot that occupies a facility for whoever can see lots', async () => {
    renderScreen({
      searchParams: '?finca=f1',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.LOTS_VIEW],
    });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(
      within(rows()[1]).getByRole('link', { name: '000123-F01-P05-261014-1' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
  });

  it('names the lot without a link on the saved copy, where its page does not open', async () => {
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

    renderScreen({
      searchParams: '?finca=f1',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.LOTS_VIEW],
    });

    await screen.findByText(/Sin conexión: estás viendo la copia del/);
    expect(
      within(rows()[1]).getByText('000123-F01-P05-261014-1'),
    ).toBeInTheDocument();
    expect(
      within(rows()[1]).queryByRole('link', {
        name: '000123-F01-P05-261014-1',
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the lot without a link for whoever cannot see lots', async () => {
    renderScreen({ searchParams: '?finca=f1' });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(rows()[1]).toHaveTextContent('000123-F01-P05-261014-1');
    expect(within(rows()[1]).queryByRole('link')).toBeNull();
  });

  it('opens the lot from the menu of an occupied facility', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    router.push.mockClear();
    renderScreen({
      searchParams: '?finca=f1',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.LOTS_VIEW],
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Más acciones de C-3' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Ver el lote' }),
    );

    expect(router.push).toHaveBeenCalledWith('/lotes/detalle?id=l1');
  });

  it('disables registering without a connection', async () => {
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
    renderScreen({
      searchParams: '?finca=f1',
      permissions: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.FACILITIES_ADD],
    });

    await screen.findByRole('table', { name: 'Cajones y marquesinas' });
    expect(
      screen.getByRole('button', { name: 'Registrar elemento' }),
    ).toBeDisabled();
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
