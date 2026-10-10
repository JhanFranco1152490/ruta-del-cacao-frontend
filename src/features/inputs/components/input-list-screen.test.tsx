import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalInput,
  buildInputStock,
  buildSession,
} from '@/test/factories';
import {
  agriculturalInputsHandler,
  apiUrl,
  inputStocksHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { type FarmChoices, InputListScreen } from './input-list-screen';

type SessionUser = components['schemas']['SessionUser'];

const ALL_PERMISSIONS = [
  PERMISSIONS.INPUTS_VIEW,
  PERMISSIONS.INPUTS_ADD,
  PERMISSIONS.INPUTS_CHANGE,
  PERMISSIONS.INPUTS_DELETE,
  PERMISSIONS.INPUTS_MANAGE_STOCK,
];

const urea = buildAgriculturalInput({ id: 'urea', name: 'Urea 46 %' });
const sulfur = buildAgriculturalInput({
  id: 'sulfur',
  name: 'Azufre',
  input_type: 'fungicide',
  unit: 'ml',
  package_type: 'tub',
  package_size: '100.000',
  is_active: false,
  has_records: true,
});
const oneFarm: FarmChoices = {
  choices: [{ id: 'f1', name: 'La Esperanza', is_active: true }],
  isLoading: false,
};
const twoFarms: FarmChoices = {
  choices: [
    { id: 'f1', name: 'La Esperanza', is_active: true },
    { id: 'f2', name: 'El Retiro', is_active: true },
  ],
  isLoading: false,
};

let userId: string;
let urls: string[];

beforeEach(() => {
  userId = `input-list-${crypto.randomUUID()}`;
  urls = [];
});

afterEach(() => vi.restoreAllMocks());

function renderScreen({
  permissions = ALL_PERMISSIONS as string[],
  farms = oneFarm,
  searchParams = '',
  user = {} as Partial<SessionUser>,
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions, ...user }),
  );
  return renderWithProviders(<InputListScreen farms={farms} />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

const table = () => screen.findByRole('table', { name: 'Insumos' });

const rowOf = async (name: string) => {
  const rows = within(await table()).getAllByRole('row');
  const row = rows.find((candidate) => within(candidate).queryByText(name));
  if (!row) throw new Error(`No hay fila para ${name}`);
  return row;
};

async function menuItemsOf(name: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Más acciones de ${name}` }),
  );
  const menu = await screen.findByRole('menu');
  return within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent?.trim());
}

describe('InputListScreen', () => {
  it('shows each input with its type, unit, package, stock and state', async () => {
    server.use(
      agriculturalInputsHandler([urea, sulfur]),
      inputStocksHandler([
        buildInputStock({ input_id: 'sulfur', quantity: '250.000' }),
      ]),
    );

    renderScreen({ searchParams: '?estado=all&finca=f1' });

    const row = await rowOf('Azufre');
    expect(within(row).getByText('Fungicida')).toBeInTheDocument();
    expect(within(row).getByText('Mililitros')).toBeInTheDocument();
    expect(within(row).getByText('Pote de 100 mL')).toBeInTheDocument();
    expect(
      await within(row).findByText('250 mL · 2,5 potes'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Inactivo')).toBeInTheDocument();
    expect(
      within(await rowOf('Urea 46 %')).getByText('Sin movimientos'),
    ).toBeInTheDocument();
  });

  it('chooses the only active farm and asks for its stocks', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalInputsHandler([urea]),
      inputStocksHandler([], requests),
    );

    renderScreen();

    await waitFor(() => expect(requests[0]?.get('farm')).toBe('f1'));
    expect(urls.at(-1)).toContain('finca=f1');
    expect(screen.getByLabelText('Finca')).toHaveValue('f1');
  });

  it('waits for a farm when the producer has several', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalInputsHandler([urea]),
      inputStocksHandler([], requests),
    );

    renderScreen({ farms: twoFarms });

    await table();
    // La columna está, y pide elegir una finca en vez de esconder el inventario.
    expect(
      within(await rowOf('Urea 46 %')).getByText('Elige una finca'),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await userEvent.selectOptions(screen.getByLabelText('Finca'), 'f2');

    await waitFor(() => expect(requests[0]?.get('farm')).toBe('f2'));
  });

  it('warns when the stock is negative, with text and not only color', async () => {
    server.use(
      agriculturalInputsHandler([urea]),
      inputStocksHandler([
        buildInputStock({ input_id: 'urea', quantity: '-20.000' }),
      ]),
    );

    renderScreen({ searchParams: '?finca=f1' });

    const row = await rowOf('Urea 46 %');
    expect(await within(row).findByText(/−20 kg/)).toBeInTheDocument();
    expect(
      within(row).getByText('Faltan entradas por registrar'),
    ).toBeInTheDocument();
  });

  it('shows the active inputs first and filters by type, state and a normalized name', async () => {
    server.use(agriculturalInputsHandler([urea, sulfur]), inputStocksHandler());

    renderScreen();

    expect(await rowOf('Urea 46 %')).toBeInTheDocument();
    expect(screen.queryByText('Azufre')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'all');
    expect(await rowOf('Azufre')).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      'fungicide',
    );
    await waitFor(() =>
      expect(screen.queryByText('Urea 46 %')).not.toBeInTheDocument(),
    );

    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      '',
    );
    await userEvent.type(screen.getByLabelText('Buscar por nombre'), 'urea46');
    await waitFor(() =>
      expect(screen.queryByText('Azufre')).not.toBeInTheDocument(),
    );
    expect(await rowOf('Urea 46 %')).toBeInTheDocument();
  });

  it('says when no input matches and clears the filters', async () => {
    server.use(agriculturalInputsHandler([urea]), inputStocksHandler());

    renderScreen({ searchParams: '?buscar=azufre' });

    expect(
      await screen.findByText('No se encontraron insumos'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );

    expect(await rowOf('Urea 46 %')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Limpiar filtros' }),
    ).not.toBeInTheDocument();
  });

  it('invites to register the first input when the catalog is empty', async () => {
    server.use(agriculturalInputsHandler([]), inputStocksHandler());

    renderScreen();

    expect(
      await screen.findByText('Aún no hay insumos registrados'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Registrar insumo' }),
    ).not.toHaveLength(0);
  });

  it('offers every action to someone with every permission', async () => {
    server.use(agriculturalInputsHandler([urea]), inputStocksHandler());

    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Editar Urea 46 %' }),
    ).toBeEnabled();
    expect(await menuItemsOf('Urea 46 %')).toEqual([
      'Registrar entrada',
      'Registrar conteo',
      'Ver movimientos',
      'Desactivar',
      'Eliminar',
    ]);
    // Entrada y movimientos, además, a la vista en la fila.
    expect(
      screen.getByRole('button', { name: 'Registrar entrada de Urea 46 %' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('link', { name: 'Ver movimientos de Urea 46 %' }),
    ).toHaveAttribute('href', '/insumos/movimientos?id=urea&finca=f1');
    expect(
      screen.getByRole('menuitem', { name: 'Ver movimientos' }),
    ).toHaveAttribute('href', '/insumos/movimientos?id=urea&finca=f1');
  });

  it('does not offer to delete an input with records, nor an entry of an inactive one', async () => {
    server.use(agriculturalInputsHandler([sulfur]), inputStocksHandler());

    renderScreen({ searchParams: '?estado=all' });

    expect(await menuItemsOf('Azufre')).toEqual([
      'Registrar conteo',
      'Ver movimientos',
      'Activar',
    ]);
  });

  it('shows only what the permissions allow', async () => {
    server.use(agriculturalInputsHandler([urea]), inputStocksHandler());

    renderScreen({ permissions: [PERMISSIONS.INPUTS_VIEW] });

    await rowOf('Urea 46 %');
    expect(
      screen.queryByRole('button', { name: 'Registrar insumo' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar Urea 46 %' }),
    ).not.toBeInTheDocument();
    expect(await menuItemsOf('Urea 46 %')).toEqual(['Ver movimientos']);
  });

  it('keeps showing the saved copy without a connection, with its date, and disables the actions', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-inputs',
      value: [urea],
      fetchedAt: Date.UTC(2026, 9, 7, 17, 5),
    });
    await getOfflineDb(userId).cache.put({
      key: 'input-stocks:farm:f1',
      value: [buildInputStock({ input_id: 'urea', quantity: '50.000' })],
      fetchedAt: Date.UTC(2026, 9, 7, 17, 5),
    });
    server.use(
      http.get(apiUrl('/api/agricultural-inputs'), () => HttpResponse.error()),
      http.get(apiUrl('/api/input-stocks'), () => HttpResponse.error()),
    );

    renderScreen({ searchParams: '?finca=f1' });

    expect(
      await screen.findByText(
        'Sin conexión: puedes consultar los insumos y sus existencias del 7 de octubre de 2026, 12:05 p.m., pero registrar o editar necesita conexión.',
      ),
    ).toBeInTheDocument();
    const row = await rowOf('Urea 46 %');
    expect(await within(row).findByText('50 kg · 1 bulto')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Registrar insumo' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Editar Urea 46 %' }),
    ).toBeDisabled();
  });

  it('says the stocks of a farm were never loaded without a connection', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-inputs',
      value: [urea],
      fetchedAt: Date.UTC(2026, 9, 7, 17, 5),
    });
    server.use(
      http.get(apiUrl('/api/agricultural-inputs'), () => HttpResponse.error()),
      http.get(apiUrl('/api/input-stocks'), () => HttpResponse.error()),
    );

    renderScreen({ searchParams: '?finca=f1' });

    const row = await rowOf('Urea 46 %');
    expect(
      await within(row).findByText('Sin datos de esta finca'),
    ).toBeInTheDocument();
  });

  it('asks for a connection once when there is no saved copy', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-inputs'), () => HttpResponse.error()),
    );

    renderScreen();

    expect(
      await screen.findByText(
        'Necesitas conexión una vez para cargar los insumos.',
      ),
    ).toBeInTheDocument();
  });

  it('lets the technical account see every catalog with its producer, and stocks only for one', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalInputsHandler([urea], requests),
      inputStocksHandler(),
    );

    renderScreen({
      user: { is_superuser: true, producer_id: null },
      farms: { isLoading: false },
    });

    const row = await rowOf('Urea 46 %');
    expect(
      within(row).getByText('Productora De Prueba · ASO-001'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Elige un productor para ver las existencias de sus fincas.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Finca')).not.toBeInTheDocument();
    expect(requests[0].has('producer')).toBe(false);
  });

  it('reads the catalog of the producer chosen by the technical account', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalInputsHandler([urea], requests),
      inputStocksHandler(),
      http.get(apiUrl('/api/producers/p2'), () =>
        HttpResponse.json({
          id: 'p2',
          first_name: 'Otra',
          last_name: 'Productora',
          member_code: 'ASO-002',
        }),
      ),
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    );

    renderScreen({
      user: { is_superuser: true, producer_id: null },
      searchParams: '?productor=p2',
    });

    await rowOf('Urea 46 %');
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      screen.queryByText('Productora De Prueba · ASO-001'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Finca')).toHaveValue('f1');
  });
});
