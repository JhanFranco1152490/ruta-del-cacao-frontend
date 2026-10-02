import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildFarm, buildSession } from '@/test/factories';
import { apiUrl, farmsHandler, municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { enqueueFarmCreate, enqueueFarmUpdate } from '../farm-queue';
import type { FarmFormValues } from '../schemas';
import { FarmListScreen } from './farm-list-screen';

const farm: FarmFormValues = {
  name: 'La Esperanza',
  municipality_id: '54001',
  details: 'Vereda El Pórtico, km 4',
  area_hectares: '12.50',
  altitude_masl: '950',
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

let userId: string;

beforeEach(async () => {
  userId = `farm-list-${crypto.randomUUID()}`;
  // La app lo registra cada vez que el servidor confirma la sesión.
  await recordLogin(userId);
  server.use(municipalitiesHandler(), farmsHandler());
});

function renderScreen({
  permissions = [PERMISSIONS.FARMS_VIEW, PERMISSIONS.FARMS_ADD] as string[],
  searchParams = '',
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(<FarmListScreen />, { queryClient, searchParams });
}

const farmCards = async () =>
  within(await screen.findByRole('list', { name: 'Fincas' })).getAllByRole(
    'article',
  );

describe('FarmListScreen', () => {
  it('invites to register the first farm when there are none', async () => {
    renderScreen();

    expect(
      await screen.findByText('Aún no tienes fincas registradas'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Registrar finca' })[0],
    ).toHaveAttribute('href', '/fincas/nueva');
  });

  it('hides the register action without the add permission', async () => {
    renderScreen({ permissions: [PERMISSIONS.FARMS_VIEW] });

    await screen.findByText('Aún no tienes fincas registradas');
    expect(
      screen.queryByRole('link', { name: 'Registrar finca' }),
    ).not.toBeInTheDocument();
  });

  it('lists the farms saved on the device, sorted by name, as pending', async () => {
    await enqueueFarmCreate(userId, 'f1', { ...farm, name: 'Villa Rosa' });
    await enqueueFarmCreate(userId, 'f2', farm);
    renderScreen();

    const cards = await farmCards();
    expect(
      cards.map((card) => within(card).getByRole('heading').textContent),
    ).toEqual(['La Esperanza', 'Villa Rosa']);
    expect(await within(cards[0]).findByText('Cúcuta')).toBeInTheDocument();
    expect(
      within(cards[0]).getByText('Vereda El Pórtico, km 4'),
    ).toBeInTheDocument();
    expect(within(cards[0]).getByText('12.50 ha')).toBeInTheDocument();
    expect(
      within(cards[0]).getByText('Pendiente de sincronización'),
    ).toBeInTheDocument();
  });

  it('marks the farms that are still waiting to be synchronized', async () => {
    await enqueueFarmCreate(userId, 'f1', farm);
    renderScreen();

    const [card] = await farmCards();
    expect(
      within(card).getByText('Pendiente de sincronización'),
    ).toBeInTheDocument();
  });

  it('shows why a farm could not be synchronized', async () => {
    await enqueueFarmCreate(userId, 'f1', farm);
    await getOfflineDb(userId).queue.update('f1', {
      status: 'error',
      errorMessage: 'Ya existe una finca con este nombre.',
    });
    renderScreen();

    const [card] = await farmCards();
    expect(within(card).getByText('Pendiente con error')).toBeInTheDocument();
    expect(
      within(card).getByText('Ya existe una finca con este nombre.'),
    ).toBeInTheDocument();
  });

  it('lets a pending farm be corrected but not discarded', async () => {
    await enqueueFarmCreate(userId, 'f1', farm);
    renderScreen();

    const [card] = await farmCards();
    expect(
      within(card).getByRole('link', { name: 'Corregir La Esperanza' }),
    ).toHaveAttribute('href', '/fincas/editar?id=f1');
    expect(
      within(card).queryByRole('button', { name: 'Descartar' }),
    ).not.toBeInTheDocument();
  });

  it('discards a failed farm only after explicit confirmation', async () => {
    const user = userEvent.setup();
    await enqueueFarmCreate(userId, 'f1', farm);
    await getOfflineDb(userId).queue.update('f1', { status: 'error' });
    renderScreen();

    const [card] = await farmCards();
    await user.click(within(card).getByRole('button', { name: 'Descartar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await getOfflineDb(userId).queue.get('f1')).toBeDefined();

    await user.click(within(card).getByRole('button', { name: 'Descartar' }));
    expect(
      screen.getByRole('heading', {
        name: '¿Descartar la finca La Esperanza?',
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar finca' }));

    expect(
      await screen.findByText('Aún no tienes fincas registradas'),
    ).toBeInTheDocument();
    expect(await getOfflineDb(userId).queue.get('f1')).toBeUndefined();
  });

  it('shows no queue actions without the add permission', async () => {
    await enqueueFarmCreate(userId, 'f1', farm);
    renderScreen({ permissions: [PERMISSIONS.FARMS_VIEW] });

    const [card] = await farmCards();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
  });

  it('filters by municipality without accents and explains an empty result', async () => {
    const user = userEvent.setup();
    await enqueueFarmCreate(userId, 'f1', farm);
    await enqueueFarmCreate(userId, 'f2', {
      ...farm,
      name: 'El Porvenir',
      municipality_id: '54518',
      details: '',
    });
    renderScreen({ searchParams: '?buscar=cucuta' });

    await screen.findByText('Cúcuta');
    expect(await farmCards()).toHaveLength(1);
    expect(screen.getByText('La Esperanza')).toBeInTheDocument();

    const search = screen.getByLabelText('Buscar finca');
    await user.clear(search);
    await user.type(search, 'no existe');
    expect(
      await screen.findByText('No hay fincas que coincidan'),
    ).toBeInTheDocument();
  });

  it('does not show farms saved by another person on the same device', async () => {
    await enqueueFarmCreate(`other-${crypto.randomUUID()}`, 'f9', farm);
    renderScreen();

    expect(
      await screen.findByText('Aún no tienes fincas registradas'),
    ).toBeInTheDocument();
  });

  it('leaves the connection state to the header', async () => {
    renderScreen();

    await screen.findByText('Aún no tienes fincas registradas');
    expect(screen.queryByText('Con conexión')).not.toBeInTheDocument();
  });

  it('lists the farms from the server with their state and actions', async () => {
    server.use(
      farmsHandler([
        buildFarm({ id: 's1', name: 'El Porvenir', is_active: false }),
      ]),
    );
    renderScreen({
      permissions: [PERMISSIONS.FARMS_VIEW, PERMISSIONS.FARMS_CHANGE],
    });

    const [card] = await farmCards();
    expect(within(card).getByText('El Porvenir')).toBeInTheDocument();
    expect(within(card).getByText('Inactiva')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Editar El Porvenir' }),
    ).toHaveAttribute('href', '/fincas/editar?id=s1');
    expect(
      within(card).getByRole('button', { name: 'Activar' }),
    ).toBeInTheDocument();
  });

  it('shows a pending edit instead of the outdated server copy', async () => {
    server.use(farmsHandler([buildFarm({ id: 's1', name: 'Nombre viejo' })]));
    await enqueueFarmUpdate(userId, 's1', { ...farm, name: 'Nombre nuevo' }, 1);
    renderScreen();

    const cards = await farmCards();
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Nombre nuevo')).toBeInTheDocument();
    expect(
      within(cards[0]).getByText('Pendiente de sincronización'),
    ).toBeInTheDocument();
  });

  it('deactivates a server farm with the version it read', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      farmsHandler([buildFarm({ id: 's1', version: 3 })]),
      http.patch(apiUrl('/api/farms/s1'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          buildFarm({ id: 's1', version: 4, is_active: false }),
        );
      }),
    );
    renderScreen({
      permissions: [PERMISSIONS.FARMS_VIEW, PERMISSIONS.FARMS_CHANGE],
    });

    const [card] = await farmCards();
    await user.click(within(card).getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Desactivar finca' }));

    await waitFor(() =>
      expect(bodies).toEqual([{ is_active: false, expected_version: 3 }]),
    );
  });

  it('explains a stale version when changing the state', async () => {
    const user = userEvent.setup();
    server.use(
      farmsHandler([buildFarm({ id: 's1' })]),
      http.patch(apiUrl('/api/farms/s1'), () =>
        apiError(409, 'stale_version', 'La finca cambió.'),
      ),
    );
    renderScreen({
      permissions: [PERMISSIONS.FARMS_VIEW, PERMISSIONS.FARMS_CHANGE],
    });

    const [card] = await farmCards();
    await user.click(within(card).getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Desactivar finca' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Alguien cambió esta finca mientras tanto.',
    );
  });

  it('keeps showing the farms on the device when the server cannot be reached', async () => {
    server.use(http.get(apiUrl('/api/farms'), () => HttpResponse.error()));
    await enqueueFarmCreate(userId, 'f1', farm);
    renderScreen();

    expect(
      await screen.findByText(/No fue posible cargar tus fincas del servidor/),
    ).toBeInTheDocument();
    expect(await farmCards()).toHaveLength(1);
  });

  it('asks the server again every two minutes while visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const requests: URLSearchParams[] = [];
      server.use(farmsHandler([], requests));
      renderScreen();
      await screen.findByText('Aún no tienes fincas registradas');
      const before = requests.length;

      await vi.advanceTimersByTimeAsync(120_000);

      await waitFor(() => expect(requests.length).toBeGreaterThan(before));
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends the search to the server', async () => {
    const requests: URLSearchParams[] = [];
    server.use(farmsHandler([], requests));
    renderScreen({ searchParams: '?buscar=cucuta' });

    await screen.findByText('No hay fincas que coincidan');
    expect(requests.at(-1)?.get('search')).toBe('cucuta');
  });

  it('places every listed farm on the map, colored by its state', async () => {
    server.use(
      farmsHandler([
        buildFarm({ id: 's1', name: 'El Porvenir', is_active: false }),
      ]),
    );
    await enqueueFarmCreate(userId, 'f1', farm);
    renderScreen();

    const map = await screen.findByRole('list', {
      name: 'Marcadores del mapa',
    });
    expect(map).toHaveTextContent('La Esperanza (info) 7.8234567, -72.5123456');
    expect(map).toHaveTextContent('El Porvenir (warn)');
  });

  it('shows an empty map when there are no farms yet', async () => {
    renderScreen();

    expect(
      await screen.findByText('Aún no hay fincas para mostrar en el mapa.'),
    ).toBeInTheDocument();
  });

  describe('without connection', () => {
    beforeEach(() => onlineManager.setOnline(false));
    // Desmontar antes de reconectar: si no, lo que quedó en pausa se reanuda al volver la red y
    // hace peticiones cuando el test ya terminó.
    afterEach(() => {
      cleanup();
      onlineManager.setOnline(true);
    });

    it('shows the farms on the device instead of loading forever', async () => {
      await enqueueFarmCreate(userId, 'f1', farm);
      renderScreen();

      expect(
        await screen.findByText(/Sin conexión: se muestran solo las fincas/),
      ).toBeInTheDocument();
      expect(await farmCards()).toHaveLength(1);
      expect(
        screen.queryByRole('status', { name: 'Cargando fincas' }),
      ).not.toBeInTheDocument();
    });
  });
});
