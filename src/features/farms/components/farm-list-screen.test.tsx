import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { enqueueFarmCreate } from '../farm-queue';
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
  server.use(
    municipalitiesHandler([
      { code: '54001', name: 'Cúcuta' },
      { code: '54518', name: 'Pamplona' },
    ]),
  );
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

  it('reports how many farms are waiting to be synchronized', async () => {
    await enqueueFarmCreate(userId, 'f1', farm);
    renderScreen();

    expect(
      await screen.findByText('1 registro pendiente de sincronización.'),
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
    ).toHaveAttribute('href', '/fincas/f1/editar');
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
});
